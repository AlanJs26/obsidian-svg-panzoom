import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TextFileView } from 'obsidian';
import Panzoom from '@panzoom/panzoom'

const map = (value: number, x1: number, y1: number, x2: number, y2: number) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

const VIEW_TYPE_SVG = "svg-view";

interface Settings {
	horizontalScrollSpeed: number;
	verticalScrollSpeed: number;

	svgScale: number;

	maxZoom: number;

	// panSpeed: number;
	// panDecelerationIntensity: number;
	// panVelocityThreshold: number;
}

const DEFAULT_SETTINGS: Settings = {
	horizontalScrollSpeed: 50,
	verticalScrollSpeed: 50,
	svgScale: 100,
	maxZoom: 5,

	// panSpeed: 50,
	// panDecelerationIntensity: 50,
	// panVelocityThreshold: 40,
}

export default class SVGPanZoom extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		/**@ts-expect-error */
		this.app.viewRegistry.unregisterExtensions(["svg"]);

		this.registerExtensions(['svg'], VIEW_TYPE_SVG)

		this.registerView(VIEW_TYPE_SVG, (leaf) => new SVGView(leaf, this));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));


	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SVGView extends TextFileView {
	filecontent: string = '';
	plugin: SVGPanZoom;
	// tweenInterval: number;

	constructor(leaf: WorkspaceLeaf, plugin: SVGPanZoom) {
		super(leaf);
		this.plugin = plugin;
	}

	clear(): void {
		// window.clearInterval(this.tweenInterval)
	}

	getViewType(): string {
		return VIEW_TYPE_SVG;
	}

	getDisplayText(): string {
		return this.file ? this.file.name : "Visualização SVG";
	}

	setViewData(filecontent: string, _clear: boolean) {
		this.filecontent = filecontent

		const settings = this.plugin.settings

		const container = this.containerEl.children[1];
		container.empty()

		const svgContainer = container.createDiv({ cls: "svg-container" });

		svgContainer.innerHTML = filecontent

		svgContainer.style.setProperty('--svg-scale', (settings.svgScale / 100).toString())

		const panzoom = Panzoom(svgContainer, {
			maxScale: settings.maxZoom,
			contain: "outside",
			pinchAndPan: true
		})


		container.addEventListener('wheel', function(event: WheelEvent) {
			event.preventDefault()
			if (event.shiftKey) {
				const speed = settings.horizontalScrollSpeed / 100
				const { x, y } = panzoom.getPan()
				panzoom.pan(x - event.deltaY * speed, y)
			} else if (event.ctrlKey) {
				panzoom.zoomWithWheel(event)
			} else {
				const speed = settings.verticalScrollSpeed / 100
				const { x, y } = panzoom.getPan()
				panzoom.pan(x, y - event.deltaY * speed)
			}

		})
		const blockTouchEvent = (event: Event) => {
			event.stopPropagation();
			event.preventDefault();
		};

		["touchstart", "touchmove", "touchend", "touchcancel"].forEach((eventName: string) => {
			container.addEventListener(eventName, blockTouchEvent, { passive: false });
		});

		// const prevTouch = { x: 0, y: 0, }
		// const tweenVelocity = { x: 0, y: 0, }
		//
		// container.addEventListener('touchmove', function(event: TouchEvent) {
		// 	if (event.touches.length > 1) {
		// 		tweenVelocity.x = 0
		// 		tweenVelocity.y = 0
		// 		return
		// 	}
		// 	const [x, y] = [event.touches[0].screenX, event.touches[0].screenY]
		//
		// 	const scaleFactor = panzoom.getScale() / ((panzoom.getOptions().maxScale ?? 1) - (panzoom.getOptions().minScale ?? 1))
		// 	const panFactor = map(settings.panSpeed, 0, 100, 0, 4)
		//
		// 	tweenVelocity.x = (x - prevTouch.x) * panFactor * (1 - scaleFactor)
		// 	tweenVelocity.y = (y - prevTouch.y) * panFactor * (1 - scaleFactor)
		//
		// 	prevTouch.x = x
		// 	prevTouch.y = y
		// })
		//
		//
		// container.addEventListener('touchend', (event: TouchEvent) => {
		// 	const scaleFactor = panzoom.getScale() / ((panzoom.getOptions().maxScale ?? 1) - (panzoom.getOptions().minScale ?? 1))
		//
		// 	if (event.changedTouches.length > 1 || Math.sqrt(tweenVelocity.x ** 2 + tweenVelocity.y ** 2) < settings.panVelocityThreshold * (1 - scaleFactor)) return
		//
		// 	this.tweenInterval = window.setInterval(() => {
		// 		const { x, y } = panzoom.getPan()
		// 		panzoom.pan(x + tweenVelocity.x, y + tweenVelocity.y)
		//
		// 		const desaceleration = map(settings.panDecelerationIntensity, 0, 100, 0, 4)
		// 		tweenVelocity.x = Math.max(0, Math.abs(tweenVelocity.x) - desaceleration) * Math.sign(tweenVelocity.x)
		// 		tweenVelocity.y = Math.max(0, Math.abs(tweenVelocity.y) - desaceleration) * Math.sign(tweenVelocity.y)
		//
		// 		if ((tweenVelocity.x + tweenVelocity.y) == 0) {
		// 			window.clearInterval(this.tweenInterval)
		// 		}
		// 	}, 20)
		// })
		//
		// container.addEventListener('touchstart', () => {
		// 	window.clearInterval(this.tweenInterval)
		// 	tweenVelocity.x = 0
		// 	tweenVelocity.y = 0
		// })

	}

	getViewData(): string {
		return this.filecontent
	}
}


class SettingsTab extends PluginSettingTab {
	plugin: SVGPanZoom;

	constructor(app: App, plugin: SVGPanZoom) {
		super(app, plugin);
		this.plugin = plugin;
	}

	inputSetting(name: string, description: string, fieldName: keyof Settings, lowBound: number, highBound: number) {
		const { containerEl } = this;

		return new Setting(containerEl)
			.setName(name)
			.setDesc(description)
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS[fieldName].toString())
				.setValue(this.plugin.settings[fieldName].toString())
				.onChange(async (value) => {
					this.plugin.settings[fieldName] = Math.clamp(parseInt(value), lowBound, highBound);
					await this.plugin.saveSettings();
				}));
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.inputSetting(
			'Horizontal scroll speed',
			'choose a value between 1 and 200',
			'horizontalScrollSpeed',
			1, 200
		)

		this.inputSetting(
			'Vertical scroll speed',
			'choose a value between 1 and 200',
			'verticalScrollSpeed',
			1, 200
		)

		this.inputSetting(
			'SVG Scale',
			'choose a value between 10 and 100',
			'svgScale',
			10, 100
		)

		this.inputSetting(
			'Max Zoom',
			'choose a value between 3 and 10',
			'maxZoom',
			3, 10
		)


		// this.inputSetting(
		// 	'Pan Speed',
		// 	'choose a value between 10 and 100',
		// 	'panSpeed',
		// 	10, 100
		// )
		//
		// this.inputSetting(
		// 	'Pan Deceleration Intensity',
		// 	'choose a value between 10 and 100',
		// 	'panDecelerationIntensity',
		// 	10, 100
		// )
		//
		// this.inputSetting(
		// 	'pan Velocity Threshold',
		// 	'choose a value between 10 and 100',
		// 	'panVelocityThreshold',
		// 	10, 100
		// )

	}
}

