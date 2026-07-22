# Serpent Halo 技术文档

## 1. 技术栈

- 构建：Vite 7 源码合同，`base: "./"`，TypeScript 5；本地视觉 QA 也通过 Vite 5 缓存依赖验证，避免环境审批失败阻断基线检查。
- 渲染：Three.js WebGLRenderer、GLSL vertex/fragment shader、InstancedMesh、Float DataTexture。
- 运动：无尽三次贝塞尔曲线路径、seek/orbit/coil/wander 转向力、并行传输坐标架。
- 界面：原生 DOM/CSS，不引入 UI 框架；Web Audio API 生成短促反馈音。
- 上游：`Sujenphea/procedural-snake@fce15746389d8a358be228d92d3c82fb989be915`，MIT；完整声明见 `LICENSE` 和 `THIRD_PARTY_NOTICES.md`。

## 2. 目录结构

```text
src/
  index.html                    页面入口与原版 baseline 导航
  css/style.css                 原版 Codrops 样式 + sh- 系列界面样式
  js/main.ts                    Three.js 场景、相机、循环与体验层编排
  js/ExperienceUI.ts            幽灵手指、环绕识别、状态闭环、音频
  js/i18n.ts                    zh/en 轻量文案
  js/components/Snake.ts        蛇体、目标球、shader uniform 与更新
  js/curves/CurveGenerator.ts   seek/orbit/coil/wander 曲线段生成
  js/curves/EndlessCurve.ts     滑动窗口与并行传输帧缓存
  js/utils/input.ts             鼠标、触摸及引导的统一坐标入口
  js/utils/properties.ts        移动端质量档与 baseline 开关
  shaders/snake/                实例化鳞片定位、斑纹、光照、完成脉冲
  shaders/ball/                 目标光珠材质
doc/                            需求、视觉与技术文档
```

## 3. 核心模块

### 状态与主循环

`main.ts` 每帧先运行原 `RAFCollection`，再从 `ExperienceUI.update(delta)` 取得 `{progress, haloPhase}`，把 `haloPhase` 写入 `Snake.setRitualPhase()`，随后执行原蛇体更新与 WebGL 渲染。状态顺序为 `idle/guide → tracking → halo → idle`，其中 `haloPhase=-1` 表示原材质，`0..1` 表示完成脉冲位置。

`CurveGenerator` 对首帧“曲线起点与目标珠重合”增加 `dist < 0.001` 边界：沿上一切线起步，不对零向量进入 coil 计算。这防止第一段垂直窜出场景，并保留后续原 seek/orbit/coil 行为。

### 曲线与渲染

`CurveGenerator` 每次生成 4–8 单位的三次贝塞尔段，使用 seek、近距离 orbit、垂直 coil、simplex wander 和 1.15 弧度最大转向限制。`EndlessCurve` 根据蛇头前进距离按需添加新段、移除尾部旧段，并缓存每段 11 个并行传输法线。`SnakeObject` 每帧把 64–100 个位置与法线样本上传到 Float DataTexture，vertex shader 用它们摆放 512–800 个压扁八面体实例。

浮点曲线纹理使用 `NearestFilter` 读取离散行，不再依赖移动 WebView 不一定提供的 `OES_texture_float_linear`。产品模式还在鳞片下方维护一层 CPU 连续蛇身：它直接采样同一个 `EndlessCurve` basis，并复用头、颈、尾粗细公式写入动态 `BufferGeometry`；即使顶点纹理不可用，主蛇身仍可显示。

### 输入、引导与闭环

`main.ts` 在产品模式也创建 OrbitControls。`Input.preInit(false)` 停止全局 pointermove 偷走目标球；`ExperienceUI` 在 capture 阶段只接管从当前珍珠 64 px 命中区起手的手势，其他起点交给 OrbitControls，手势期间不中途换所有者。`Input.setVirtualPosition()` 仍让命中后的真实指针、键盘圆周和幽灵手指共享同一 NDC 入口。`ExperienceUI` 累计同向极角达 `1.65π` 后进入 1.8 秒完成态，fragment shader 的 `u_ritual` 窄带从尾扫向头，结束后恢复 `-1`。

### 屏幕适配与性能

`Properties.getSnakeConfig()` 使用移动端低档（64×8 实例、64 个纹理采样、DPR 1）和桌面高档（100×8、100 采样、设备 DPR）。低档由手机 UA **或** `innerWidth≤600` 任一条件触发。产品触点投射到穿过当前构图中心的相机正对平面；蛇、目标球和交互平面作为同一 Group，平滑跟随曲线包围盒中心，因此自由相机和随机曲线都不会把主蛇身长期送出竖屏。`?baseline=1` 保留原水平地面映射。DOM 使用安全区、390×844 与 320×568 固定全屏测试；页面 `overflow:hidden`、`touch-action:none`。

### 音频与多语言

AudioContext 只在首次真实手势后创建。接触、25% 进度台阶和完成分别映射到低频正弦、短三角波与 440/660 Hz 双音。`i18n.ts` 优先读取 `localStorage.game_locale`，否则按浏览器语言在中文和英文间切换；baseline 中保留的 Codrops 原版文字不参与产品界面本地化。

## 4. 扩展点

- 改环绕门槛、暂停保留时间、完成时长：修改 `src/js/ExperienceUI.ts` 顶部常量和 `update()`。
- 改蛇体颜色、斑纹、粗细或光照：修改 `src/js/components/Snake.ts` 的 uniform 默认值；不要绕过原 shader 新建第二条蛇。
- 改完成脉冲宽度与颜色：修改 `src/shaders/snake/snakeFrag.glsl` 的 `ritualWidth` 与两组颜色值。
- 改寻路、盘绕半径或有机摆动：修改 `src/js/components/Snake.ts` 的 `curveOptions`；底层力公式在 `CurveGenerator.ts`。
- 改 UI 与文案：修改 `src/css/style.css` 的 `.sh-*` 规则和 `src/js/i18n.ts`。
- 接平台 UUID、统计或存档：在 `src/js/main.ts` 入口导入自动生成的 `game-id.ts`，并在 `ExperienceUI.complete()` 的状态边界发送事件；渲染主循环不能等待网络。
