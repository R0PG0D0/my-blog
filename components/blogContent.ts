export type BlogCategory = {
  title: string;
  slug: string;
  path: string;
  description?: string;
  children?: BlogCategory[];
};

export type CategoryFilter = "all" | string;

export type CategoryMenuItem = {
  value: CategoryFilter;
  label: string;
  path?: string;
  href?: string;
  children?: CategoryMenuItem[];
};

const CONTENT_ROOT = "content/blog";

export const blogCategories: BlogCategory[] = [
  {
    title: "靶机渗透",
    slug: "pentest",
    path: `${CONTENT_ROOT}/pentest`,
    description: "靶场、CTF 与完整渗透复盘记录。",
    children: [
      { title: "HackMyVM", slug: "hackmyvm", path: `${CONTENT_ROOT}/pentest/hackmyvm` },
      { title: "Hack The Box", slug: "hack-the-box", path: `${CONTENT_ROOT}/pentest/hack-the-box` },
      { title: "春秋云镜", slug: "chunqiu-yunjing", path: `${CONTENT_ROOT}/pentest/chunqiu-yunjing` },
      { title: "VulnHub", slug: "vulnhub", path: `${CONTENT_ROOT}/pentest/vulnhub` },
    ],
  },
  {
    title: "主机渗透",
    slug: "host-pentesting",
    path: `${CONTENT_ROOT}/host-pentesting`,
    description: "Linux、Windows 主机安全与内网横向。",
    children: [
      { title: "Linux", slug: "linux", path: `${CONTENT_ROOT}/host-pentesting/linux` },
      {
        title: "Windows",
        slug: "windows",
        path: `${CONTENT_ROOT}/host-pentesting/windows`,
        children: [
          {
            title: "内网横向",
            slug: "lateral-movement",
            path: `${CONTENT_ROOT}/host-pentesting/windows/lateral-movement`,
            children: [
              {
                title: "凭据收集",
                slug: "credential-collection",
                path: `${CONTENT_ROOT}/host-pentesting/windows/lateral-movement/credential-collection`,
              },
              {
                title: "域渗透",
                slug: "domain-pentesting",
                path: `${CONTENT_ROOT}/host-pentesting/windows/lateral-movement/domain-pentesting`,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "PWN",
    slug: "pwn",
    path: `${CONTENT_ROOT}/pwn`,
    description: "二进制漏洞利用与系统底层安全。",
    children: [
      { title: "调用约定", slug: "calling-convention", path: `${CONTENT_ROOT}/pwn/calling-convention` },
      { title: "Stack", slug: "stack", path: `${CONTENT_ROOT}/pwn/stack` },
      { title: "FSV", slug: "fsv", path: `${CONTENT_ROOT}/pwn/fsv` },
      { title: "Heap", slug: "heap", path: `${CONTENT_ROOT}/pwn/heap` },
      { title: "Kernel", slug: "kernel", path: `${CONTENT_ROOT}/pwn/kernel` },
      { title: "MISP", slug: "misp", path: `${CONTENT_ROOT}/pwn/misp` },
    ],
  },
  {
    title: "逆向",
    slug: "reverse-engineering",
    path: `${CONTENT_ROOT}/reverse-engineering`,
    description: "程序分析、动态调试与反逆向技术。",
    children: [
      { title: "静态分析", slug: "static-analysis", path: `${CONTENT_ROOT}/reverse-engineering/static-analysis` },
      { title: "动态调试", slug: "dynamic-debugging", path: `${CONTENT_ROOT}/reverse-engineering/dynamic-debugging` },
      { title: "加密算法", slug: "cryptography", path: `${CONTENT_ROOT}/reverse-engineering/cryptography` },
      { title: "VM 虚拟机逆向", slug: "vm-reversing", path: `${CONTENT_ROOT}/reverse-engineering/vm-reversing` },
      { title: "反逆向", slug: "anti-reversing", path: `${CONTENT_ROOT}/reverse-engineering/anti-reversing` },
    ],
  },
  {
    title: "SRC",
    slug: "src",
    path: `${CONTENT_ROOT}/src`,
    description: "SRC 漏洞挖掘、验证与报告记录。",
    children: [
      { title: "EDU", slug: "edu", path: `${CONTENT_ROOT}/src/edu` },
      { title: "补天", slug: "butian", path: `${CONTENT_ROOT}/src/butian` },
    ],
  },
  {
    title: "IOT",
    slug: "iot-security",
    path: `${CONTENT_ROOT}/iot-security`,
    description: "IoT 固件、设备服务与通信安全分析。",
    children: [
      { title: "Web", slug: "web", path: `${CONTENT_ROOT}/iot-security/web` },
      { title: "OTA", slug: "ota", path: `${CONTENT_ROOT}/iot-security/ota` },
      {
        title: "固件分析",
        slug: "firmware-analysis",
        path: `${CONTENT_ROOT}/iot-security/firmware-analysis`,
      },
    ],
  },
];

function toMenuItem(category: BlogCategory, parents: string[] = []): CategoryMenuItem {
  const filterPath = [...parents, category.slug].join("/");

  return {
    value: filterPath,
    label: category.title,
    path: category.path,
    children: category.children?.map((child) =>
      toMenuItem(child, [...parents, category.slug]),
    ),
  };
}

export const categories: CategoryMenuItem[] = [
  { value: "all", label: "全部" },
  ...blogCategories.map((category) => toMenuItem(category)),
];

export function findBlogCategory(slugs: string[]) {
  let currentCategories = blogCategories;
  let current: BlogCategory | undefined;

  for (const slug of slugs) {
    current = currentCategories.find((category) => category.slug === slug);
    if (!current) return undefined;
    currentCategories = current.children ?? [];
  }

  return current;
}
