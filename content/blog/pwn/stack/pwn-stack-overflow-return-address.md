---
title: "PWN 入门：栈溢出与返回地址控制"
slug: "pwn-stack-overflow-return-address"
date: "2026-05-29"
excerpt: "从程序内存布局开始，理解基础栈溢出、调试过程与利用链构造。"
category: "pwn"
subcategory: "stack"
image: "/anime-girl-wallpaper.png"
heroImage: "/微信图片_20260702094637_1119_2.png"
wordCount: "685 字"
---

PWN 文章可以从二进制保护、输入点、崩溃位置和寄存器状态开始写。先把现象记录清楚，再解释背后的内存结构。

栈溢出的关键是确认偏移、控制返回地址，并判断程序是否开启 NX、Canary、PIE 等保护。每一步最好都附上调试依据。

后续可以继续补充 payload 构造、ROP 链思路、libc 泄露方式和最终 getshell 的完整过程。
