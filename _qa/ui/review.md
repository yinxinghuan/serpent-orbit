# Serpent Halo 视觉 QA

## 证据

- `bug-snake-offscreen-before-390x844.jpg`：修复前引导结束后的同类无输入状态，目标滞留左侧，蛇身主体游出画面。
- `bug-snake-centered-after-390x844.jpg`：修复后 390×844 无输入状态，引导目标已交还中心，完整蛇身再次成为画面主体。
- `bug-snake-centered-after-320x568.jpg`：修复后窄屏状态，粗壮主干、目标球和尾部鳞片同时可见。

## 检查结论

- P0 根因：3.2 秒幽灵引导停在 0.78 圈末点，但它操作的真实追踪目标没有回中；蛇体在引导消失后仍持续追随画外偏左目标。
- 修复：幽灵手指消失的同一帧调用原 `Input.setVirtualPosition()` 入口重置到屏幕中心；目标球继续用原 lerp，蛇体继续用原 seek/orbit/coil 曲线自然回场。
- 回归：390×844 与 320×568 均无 WebGL/shader 错误；baseline 分支不创建 `ExperienceUI`，因此原版行为未被改动。
- 视觉评分：层级 5，连贯性 5，可读性 4，手感 4，素材质量 5，响应式 4，完成度 4；平均 4.4，无低于 3 项。
