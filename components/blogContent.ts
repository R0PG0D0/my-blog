export type PostCategory =
  | "PENTEST"
  | "PWN"
  | "IOT"
  | "SRC"
  | "REVERSE"
  | "SECURITY_TEST"
  | "LATERAL";

export type CategoryFilter = "ALL" | PostCategory;

export type CategoryMenuItem = {
  value?: CategoryFilter;
  label: string;
  href?: string;
  children?: CategoryMenuItem[];
};

export type BlogPost = {
  slug: string;
  date: string;
  archiveDate?: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  categoryLabel: string;
  readTime: string;
  wordCount: string;
  image: string;
  content: string[];
};

export const categories: CategoryMenuItem[] = [
  { value: "ALL", label: "全部" },
  {
    value: "PENTEST",
    label: "靶机渗透",
    children: [
      { value: "PENTEST", label: "VulnHub" },
      { value: "PENTEST", label: "HackTheBox" },
      {
        label: "复盘路线",
        children: [
          { value: "PENTEST", label: "信息收集" },
          { value: "PENTEST", label: "权限提升" },
        ],
      },
    ],
  },
  {
    value: "PWN",
    label: "PWN",
    children: [
      { value: "PWN", label: "栈溢出" },
      { value: "PWN", label: "ROP" },
      { value: "PWN", label: "堆利用" },
    ],
  },
  {
    value: "IOT",
    label: "IoT",
    children: [
      { value: "IOT", label: "固件分析" },
      { value: "IOT", label: "服务识别" },
    ],
  },
  {
    value: "SRC",
    label: "SRC",
    children: [
      { value: "SRC", label: "漏洞报告" },
      { value: "SRC", label: "复现记录" },
    ],
  },
  {
    value: "REVERSE",
    label: "逆向",
    children: [
      { value: "REVERSE", label: "静态分析" },
      { value: "REVERSE", label: "动态调试" },
    ],
  },
  {
    value: "SECURITY_TEST",
    label: "渗透测试",
    children: [
      { value: "SECURITY_TEST", label: "Web 安全" },
      { value: "SECURITY_TEST", label: "权限验证" },
    ],
  },
  {
    value: "LATERAL",
    label: "内网横向",
    children: [
      { value: "LATERAL", label: "凭据收集" },
      { value: "LATERAL", label: "横向移动" },
    ],
  },
];

export const posts: BlogPost[] = [
  {
    slug: "pentest-replay-from-recon-to-privilege",
    date: "JUN 18, 2026",
    archiveDate: "2026年6月18日",
    title: "从信息收集到权限获取：一次靶机渗透复盘",
    excerpt: "记录完整渗透思路、关键入口、提权路径，以及复盘过程中值得保留的方法。",
    category: "PENTEST",
    categoryLabel: "靶机渗透",
    readTime: "12 MIN",
    wordCount: "1.4k 字",
    image: "/anime-melancholy.png",
    content: [
      "这篇文章用于记录一次靶机渗透的完整复盘流程。正式写文章时，你可以把这一段替换成你的环境说明、目标地址、测试范围和前置条件。",
      "信息收集阶段建议按资产识别、端口服务、Web 指纹、目录探测和弱点假设来整理。每一个结论都尽量保留命令、截图或关键响应，方便之后复盘。",
      "漏洞利用阶段可以记录入口点、验证过程、利用条件和失败尝试。好的复盘不只是写成功路径，也要写清楚为什么其它路径不成立。",
      "权限提升和横向思考部分建议单独拆开：当前权限是谁、能访问什么、发现了哪些凭据或配置问题，以及最终如何形成稳定利用链。",
    ],
  },
  {
    slug: "pwn-stack-overflow-return-address",
    date: "MAY 29, 2026",
    archiveDate: "2026年5月29日",
    title: "PWN 入门：栈溢出与返回地址控制",
    excerpt: "从程序内存布局开始，理解基础栈溢出、调试过程与利用链构造。",
    category: "PWN",
    categoryLabel: "PWN",
    readTime: "10 MIN",
    wordCount: "685 字",
    image: "/anime-girl-wallpaper.png",
    content: [
      "PWN 文章可以从二进制保护、输入点、崩溃位置和寄存器状态开始写。先把现象记录清楚，再解释背后的内存结构。",
      "栈溢出的关键是确认偏移、控制返回地址，并判断程序是否开启 NX、Canary、PIE 等保护。每一步最好都附上调试依据。",
      "后续可以继续补充 payload 构造、ROP 链思路、libc 泄露方式和最终 getshell 的完整过程。",
    ],
  },
  {
    slug: "iot-firmware-filesystem-service-analysis",
    date: "APR 11, 2026",
    archiveDate: "2026年4月11日",
    title: "IoT 固件分析中的文件系统与服务识别",
    excerpt: "整理固件解包、文件系统检查、服务定位与静态分析中的常见切入点。",
    category: "IOT",
    categoryLabel: "IoT",
    readTime: "9 MIN",
    wordCount: "723 字",
    image: "/anime-melancholy.png",
    content: [
      "IoT 固件分析可以先记录固件来源、版本、设备型号和哈希，确保样本可追溯。",
      "解包之后优先观察文件系统结构、启动脚本、Web 服务目录、默认配置和可能存在的硬编码凭据。",
      "服务识别阶段建议把端口、进程、脚本入口和关键二进制对应起来，形成一张可继续深入的分析地图。",
    ],
  },
  {
    slug: "src-report-writing-process",
    date: "MAR 06, 2026",
    archiveDate: "2026年3月6日",
    title: "一次 SRC 漏洞报告的形成过程",
    excerpt: "从发现异常到验证影响，再到整理证据与编写可复现报告的完整笔记。",
    category: "SRC",
    categoryLabel: "SRC",
    readTime: "7 MIN",
    wordCount: "352 字",
    image: "/anime-girl-wallpaper.png",
    content: [
      "SRC 文章重点不是炫技，而是把漏洞影响、复现条件、边界和修复建议讲清楚。",
      "报告中建议保留时间线：如何发现异常、如何缩小范围、如何验证影响，以及如何避免越权测试。",
      "最后可以整理可复现步骤、影响说明、证明材料和修复建议，让报告既清晰又负责任。",
    ],
  },
  {
  slug: "vulnhub-containme-1",
  date: "JUN 26, 2026",
  archiveDate: "2026年6月26日",
  title: "VulnHub ContainMe：1 靶机渗透记录",
  excerpt: "记录 ContainMe 靶机的信息收集、漏洞利用、权限提升和复盘思路。",
  category: "PENTEST",
  categoryLabel: "靶机渗透",
  readTime: "12 MIN",
  wordCount: "2600 字",
  image: "/anime-melancholy.png",
  content: [
    "本次靶机的目标是 ContainMe：1，主要记录从信息收集到权限提升的完整过程。",
    "首先进行端口扫描，确认开放服务和版本信息。根据扫描结果，可以进一步判断 Web 服务、SSH 服务以及可能暴露的敏感目录。",
    "在 Web 目录枚举阶段，重点关注默认页面、备份文件、上传点、登录入口和可疑参数。",
    "漏洞利用成功后，需要整理当前权限、系统信息、计划任务、SUID 文件以及可能存在的凭据。",
    "最后复盘整个过程，记录哪些判断是有效的，哪些尝试浪费了时间，以及下次遇到类似靶机可以优先检查的方向。",
  ],
},
];

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}
