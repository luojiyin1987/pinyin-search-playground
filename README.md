# pinyin-search-playground

一个基于 [`pinyin-pro`](https://github.com/zh-lx/pinyin-pro) `match()` 的中文拼音搜索 Playground。

## Features

- 拼音、首字母和缩写搜索
- `first` / `start` / `every` / `any` 四种匹配精度
- 连续匹配开关
- `v` 匹配 `ü`
- 命中汉字高亮
- 展示 `match()` 返回的原文索引
- 内置多音字和常见中文词条示例

## Development

```bash
pnpm install
pnpm dev
```

构建：

```bash
pnpm build
```

## Roadmap

后续迭代计划加入结果 ranking，以及 `zh/z`、`ch/c`、`sh/s`、`n/l`、`an/ang` 等可配置模糊音规则。
