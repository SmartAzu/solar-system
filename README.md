# solar-system
Interactive 3D Solar System visualization built with Three.js
# 
```markdown
# 3D 交互式太阳系 (Interactive 3D Solar System)

> 一个基于 [Three.js](https://threejs.org/) 的纯前端交互式太阳系可视化演示，支持自转/公转动画、行星聚焦、UI 信息面板、速度控制、以及缩略图导航。

---

## 🚀 功能特性

- **逼真 3D 行星**：太阳系九大行星 + 月球，附带高质量球面纹理和土星环贴图  
- **自转 & 公转**：各行星按照真实速率缩放动画  
- **焦点追踪**：点击侧边栏或缩略图行星，平滑跳转 & 持续跟随  
- **UI 控制面板**：  
  - 侧边：行星列表 + 退出聚焦按钮 + 速度档位 (1–5×)  
  - 右下：百科弹窗，展示行星简介  
  - 缩略图：实时太阳系俯视图，支持点击跳转  
- **星空背景 & 虚线轨道**：360°星空、各行星轨道均为可调虚线  
- **动态分辨率**：根据渲染帧率自动调整像素比以平衡性能与清晰度  
- **响应式布局**：窗口缩放自动适配渲染器与 UI

---

## 📁 项目结构

```

solar-system/
├─ index.html
├─ style.css
├─ js/
│  └─ main.js
├─ three.js-r153/           # Three.js v153 源码 & 控件
│  ├─ build/three.module.js
│  └─ examples/jsm/…
└─ textures/                # 行星 & 星环 & 星空等贴图素材
├─ sun.jpg
├─ mercury.jpg
├─ …
├─ saturn\_ring.png
└─ starfield.jpg

````

---

## 💻 安装与运行

1. **克隆仓库**  
   ```bash
   git clone https://github.com/<你的用户名>/solar-system.git
   cd solar-system
````

2. **启动本地静态文件服务器**

   * Python 3.x:

     ```bash
     python -m http.server 8000
     ```
   * 或者使用 `live-server` / `http-server` 等工具。

3. **打开浏览器**
   访问 `http://localhost:8000/index.html` 即可查看。

---

## 🎮 使用说明

* **侧边栏**

  * **行星列表**：点击即可聚焦该行星
  * **退出聚焦**：返回整体视角
  * **速度控制**：1×–5×，实时调整动画速度

* **缩略图 (右下角)**

  * 实时俯视图，展现所有轨道
  * 点击任意星球（或月球）快速切换聚焦

* **百科弹窗**
  聚焦行星时在右下弹出，展示简要科普信息

* **拖拽 & 缩放**

  * 鼠标拖拽旋转视角
  * 滚轮缩放视距

---

## 🔧 依赖

* [Three.js v153](https://github.com/mrdoob/three.js/tree/r153)
* OrbitControls、Stats.js（已包含于 `three.js-r153/examples/jsm/`）
* 纯前端：无额外打包、无 Node.js 依赖

---

## 📝 自定义 & 拓展

* **行星数据**：可在 `js/main.js` 中 `PLANETS` 数组里修改半径、轨道距离、转速
* **增加新卫星**：参考月球模块 (`addMoon`)，挂载到任意行星上
* **UI 样式**：编辑 `style.css` 美化面板风格

---

## 📜 许可证

[MIT](LICENSE) — 欢迎自由使用、修改和分发。

---

> 欢迎在 Issue 或 PR 中反馈 BUG、贡献新功能！
> Happy coding! 🌌🔭

```
```
