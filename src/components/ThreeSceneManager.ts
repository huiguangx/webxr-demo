import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BoxLineGeometry } from "three/examples/jsm/geometries/BoxLineGeometry.js";
import ThreeMeshUI from "three-mesh-ui";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

import rawJSON from "@/assets/Roboto-msdf.json?raw";
import FontImage from "@/assets/Roboto-msdf.png";
import ThreeIcon from "@/assets/threejs.png";
const FontJSON = JSON.parse(rawJSON);

interface PanelContentText {
  type: "text";
  content: string;
  fontSize?: number;
  fontColor?: THREE.Color | number | string;
  borderRadius?: number;
}

interface PanelContentImage {
  type: "image";
  texture: string;
  width?: number;
  height?: number;
  backgroundColor?: THREE.Color | number | string;
  backgroundOpacity?: number;
  borderRadius?: number; // 👈 新增字段
}

interface PanelOptions {
  key?: string; // 唯一标识
  borderRadius?: number; // 面板圆角
  aspectRatio?: number;
  // 以后可以扩展，比如背景色、边框等
}

type PanelContent = PanelContentText | PanelContentImage;

export class ThreeSceneManager {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container: HTMLElement;
  private panels: Map<string, ThreeMeshUI.Block> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.initScene();
    this.setupEventListeners();
  }

  private initScene() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x505050);

    // Initialize camera
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    const vrButton = VRButton.createButton(this.renderer);
    this.container.appendChild(vrButton);

    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.set(0, 1.6, 0);
    this.controls.target = new THREE.Vector3(0, 1, -1.8);
    this.controls.update();

    // Add room
    const room = new THREE.LineSegments(
      new BoxLineGeometry(6, 6, 6, 10, 10, 10).translate(0, 3, 0),
      new THREE.LineBasicMaterial({ color: 0x808080 })
    );
    this.scene.add(room);
    this.renderer.xr.addEventListener("sessionstart", () => {
      console.log("🎉 XR Session started!");
    });

    this.renderer.xr.addEventListener("sessionend", () => {
      console.log("👋 XR Session ended.");
    });

    // Add text panel
    this.makeTextPanel(
      { width: 2.0, height: 0.5 },
      new THREE.Vector3(0, 1, -1.8),
      [
        {
          type: "text",
          content: "aaa\n",
          fontSize: 0.06,
          fontColor: "#ffffff",
        },
        {
          type: "text",
          content: "bbb",
          fontSize: 0.05,
          fontColor: "#c4c4c4",
        },
        // {
        //   type: "image",
        //   texture: ThreeIcon,
        //   width: 0.5,
        //   height: 0.5,
        // },
      ],
      0.1,
      {
        key: "aaa",
        borderRadius: 0.2,
      }
    );

    // Start animation loop
    this.renderer.setAnimationLoop(this.loop.bind(this));
  }

  private makeTextPanel(
    size: { width: number; height: number },
    position: THREE.Vector3,
    contentList: PanelContent[],
    padding: number = 0,
    options?: PanelOptions
  ) {
    const key = options?.key || `panel-${Date.now()}`;
    // 主容器
    const container = new ThreeMeshUI.Block({
      width: size.width,
      height: size.height,
      padding: padding,
      justifyContent: "start", // 改为起始对齐
      textAlign: "left",
      fontFamily: FontJSON,
      fontTexture: FontImage,
      fontSize: 0.05,
      interLine: 0.05,
      borderRadius: options?.borderRadius ?? 0,
      contentDirection: "row", // 关键：设置为行排列
    });

    container.position.copy(position);
    this.scene.add(container);
    this.panels.set(key, container); // 正确使用Map的set方法

    const loader = new THREE.TextureLoader();

    // 创建左右两个子容器
    const leftColumn = new ThreeMeshUI.Block({
      width: size.width * (options?.aspectRatio ?? 1), // 左侧占70%宽度
      height: size.height,
      justifyContent: "center",
      textAlign: "center",
      contentDirection: "column", // 垂直排列
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000), // 设置为黑色
      backgroundOpacity: 0, // 0 表示完全透明
    });

    const rightColumn = new ThreeMeshUI.Block({
      width: size.width * (1 - (options?.aspectRatio ?? 0)), // 右侧占30%宽度
      height: size.height,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 0,
      backgroundColor: new THREE.Color(0x000000), // 设置为黑色
      backgroundOpacity: 0, // 0 表示完全透明
    });

    container.add(leftColumn, rightColumn);

    // 分离文本和图片内容
    const texts = contentList.filter((item) => item.type === "text");
    const images = contentList.filter((item) => item.type === "image");

    // 添加文本到左列
    texts.forEach((item) => {
      if (item.type === "text") {
        leftColumn.add(
          new ThreeMeshUI.Text({
            content: item.content,
            fontSize: item.fontSize ?? 0.05,
            fontColor: item.fontColor
              ? new THREE.Color(item.fontColor)
              : undefined,
          })
        );
      }
    });

    // 添加图片到右列
    images.forEach((item) => {
      if (item.type === "image") {
        loader.load(item.texture, (texture) => {
          rightColumn.add(
            new ThreeMeshUI.InlineBlock({
              height: item.height ?? 0.3,
              width: item.width ?? 0.3,
              backgroundTexture: texture,
              backgroundColor: item.backgroundColor
                ? new THREE.Color(item.backgroundColor)
                : undefined,
              backgroundOpacity: item.backgroundOpacity,
              borderRadius: item.borderRadius ?? 0,
            })
          );
        });
      }
    });
    return key; // 返回面板key
  }

  private loop() {
    ThreeMeshUI.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public removePanel(key: string): boolean {
    const panel = this.panels.get(key); // 使用Map的get方法获取
    if (panel) {
      this.scene.remove(panel);
      this.panels.delete(key); // 使用Map的delete方法移除
      return true;
    }
    return false;
  }

  // 获取面板（可选）
  public getPanel(key: string): ThreeMeshUI.Block | undefined {
    return this.panels.get(key);
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private setupEventListeners() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  public dispose() {
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    this.renderer.setAnimationLoop(null);
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    // Add any additional cleanup here
  }
}
