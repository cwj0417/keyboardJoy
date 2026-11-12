# KeyboardJoy

浏览器里的钢琴与 MIDI 工作室。

## 功能

- 电脑键盘 / 鼠标 / 触屏演奏，支持滑奏与多指触控
- 延音踏板（Shift）、八度切换、节拍器
- 拖入 MIDI 文件即可播放：瀑布流音符从上往下落到琴键、进度拖动、循环播放、BPM 显示
- 5 首内置示例：Für Elise、The Blue Danube、Turkish March、Nocturne Op.9 No.2、Canon in D
- 4 种合成音色实时切换，带混响与动态压缩
- 设置自动保存

## 技术栈

Vite 8 · Vue 3.5 · TypeScript · Tone.js 15 · @tonejs/midi · Canvas

## 开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物输出到 dist/
npm run preview  # 预览生产构建
```

## 快捷键

| 按键 | 功能 |
| --- | --- |
| `Z` – `M` / `Q` – `U` | 演奏低音区 / 高音区 |
| `Shift` | 延音 |
| `Space` | 播放 / 暂停 MIDI |
| `←` / `→` | 快退 / 快进 5 秒 |
