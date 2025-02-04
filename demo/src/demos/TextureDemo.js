import {
	Color,
	PerspectiveCamera,
	RepeatWrapping,
	SRGBColorSpace,
	TextureLoader
} from "three";

import { SpatialControls } from "spatial-controls";
import { calculateVerticalFoV } from "three-demo";
import { ProgressManager } from "../utils/ProgressManager";
import { PostProcessingDemo } from "./PostProcessingDemo";

import * as Sponza from "./objects/Sponza";

import {
	BlendFunction,
	EdgeDetectionMode,
	EffectPass,
	SMAAEffect,
	SMAAImageLoader,
	SMAAPreset,
	TextureEffect
} from "../../../src";

/**
 * A texture demo.
 */

export class TextureDemo extends PostProcessingDemo {

	/**
	 * Constructs a new texture demo.
	 *
	 * @param {EffectComposer} composer - An effect composer.
	 */

	constructor(composer) {

		super("texture", composer);

		/**
		 * An effect.
		 *
		 * @type {Effect}
		 * @private
		 */

		this.effect = null;

	}

	load() {

		const assets = this.assets;
		const loadingManager = this.loadingManager;
		const textureLoader = new TextureLoader(loadingManager);
		const smaaImageLoader = new SMAAImageLoader(loadingManager);

		const anisotropy = Math.min(this.composer.getRenderer()
			.capabilities.getMaxAnisotropy(), 8);

		return new Promise((resolve, reject) => {

			if(assets.size === 0) {

				loadingManager.onLoad = () => setTimeout(resolve, 250);
				loadingManager.onProgress = ProgressManager.updateProgress;
				loadingManager.onError = url => console.error(`Failed to load ${url}`);

				Sponza.load(assets, loadingManager, anisotropy);

				textureLoader.load("textures/scratches.jpg", (t) => {

					t.colorSpace = SRGBColorSpace;
					t.wrapS = t.wrapT = RepeatWrapping;
					assets.set("scratches-color", t);

				});

				smaaImageLoader.load(([search, area]) => {

					assets.set("smaa-search", search);
					assets.set("smaa-area", area);

				});

			} else {

				resolve();

			}

		});

	}

	initialize() {

		const scene = this.scene;
		const assets = this.assets;
		const composer = this.composer;
		const renderer = composer.getRenderer();
		const domElement = renderer.domElement;

		// Camera

		const aspect = window.innerWidth / window.innerHeight;
		const vFoV = calculateVerticalFoV(90, Math.max(aspect, 16 / 9));
		const camera = new PerspectiveCamera(vFoV, aspect, 0.3, 2000);
		this.camera = camera;

		// Controls

		const { position, quaternion } = camera;
		const controls = new SpatialControls(position, quaternion, domElement);
		const settings = controls.settings;
		settings.rotation.setSensitivity(2.2);
		settings.rotation.setDamping(0.05);
		settings.translation.setSensitivity(3.0);
		settings.translation.setDamping(0.1);
		controls.setPosition(-9, 0.5, 0);
		controls.lookAt(0, 3, -3.5);
		this.controls = controls;

		// Sky

		scene.background = new Color(0xeeeeee);

		// Lights

		scene.add(...Sponza.createLights());

		// Objects

		scene.add(assets.get(Sponza.tag));

		// Passes

		const smaaEffect = new SMAAEffect(
			assets.get("smaa-search"),
			assets.get("smaa-area"),
			SMAAPreset.HIGH,
			EdgeDetectionMode.DEPTH
		);

		smaaEffect.edgeDetectionMaterial.setEdgeDetectionThreshold(0.01);

		const textureEffect = new TextureEffect({
			blendFunction: BlendFunction.COLOR_DODGE,
			texture: assets.get("scratches-color")
		});

		const pass = new EffectPass(camera, smaaEffect, textureEffect);

		this.effect = textureEffect;

		composer.addPass(pass);

	}

	registerOptions(menu) {

		const effect = this.effect;
		const blendMode = effect.blendMode;

		const offset = effect.texture.offset;
		const repeat = effect.texture.repeat;
		const center = effect.texture.center;

		const params = {
			"opacity": blendMode.opacity.value,
			"blend mode": blendMode.blendFunction
		};

		const folder = menu.addFolder("UV Transformation");
		folder.add(effect.texture, "rotation", 0.0, 2.0 * Math.PI, 0.001);
		folder.open();

		let subFolder = folder.addFolder("offset");
		subFolder.add(offset, "x", 0.0, 1.0, 0.001);
		subFolder.add(offset, "y", 0.0, 1.0, 0.001);

		subFolder = folder.addFolder("repeat");
		subFolder.add(repeat, "x", 0.0, 2.0, 0.001);
		subFolder.add(repeat, "y", 0.0, 2.0, 0.001);

		subFolder = folder.addFolder("center");
		subFolder.add(center, "x", 0.0, 1.0, 0.001);
		subFolder.add(center, "y", 0.0, 1.0, 0.001);

		menu.add(params, "opacity", 0.0, 1.0, 0.01).onChange((value) => {

			blendMode.opacity.value = value;

		});

		menu.add(params, "blend mode", BlendFunction).onChange((value) => {

			blendMode.setBlendFunction(Number(value));

		});

		if(window.innerWidth < 720) {

			menu.close();

		}

	}

}
