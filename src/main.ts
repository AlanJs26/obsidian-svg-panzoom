import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TextFileView } from 'obsidian';
import Panzoom from '@panzoom/panzoom'

const VIEW_TYPE_SVG = "svg-view";

interface Settings {
	horizontalScrollSpeed: number;
	verticalScrollSpeed: number;
}

const DEFAULT_SETTINGS: Settings = {
	horizontalScrollSpeed: 50,
	verticalScrollSpeed: 50,
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

	constructor(leaf: WorkspaceLeaf, plugin: SVGPanZoom) {
		super(leaf);
		this.plugin = plugin;
	}

	clear(): void { }

	getViewType(): string {
		return VIEW_TYPE_SVG;
	}

	getDisplayText(): string {
		return this.file ? this.file.name : "Visualização SVG";
	}

	setViewData(filecontent: string, _clear: boolean) {
		this.filecontent = filecontent

		const container = this.containerEl.children[1];
		container.empty()

		const svgContainer = container.createDiv({ cls: "svg-container" });

		svgContainer.innerHTML = filecontent

		const panzoom = Panzoom(svgContainer, {
			maxScale: 5
		})

		const settings = this.plugin.settings

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

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Horizontal scroll speed')
			.setDesc('choose a value between 1 and 200')
			.addText(text => text
				.setPlaceholder('50')
				.setValue(this.plugin.settings.horizontalScrollSpeed.toString())
				.onChange(async (value) => {
					this.plugin.settings.horizontalScrollSpeed = Math.clamp(parseInt(value), 1, 200);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Vertical scroll speed')
			.setDesc('choose a value between 1 and 200')
			.addText(text => text
				.setPlaceholder('50')
				.setValue(this.plugin.settings.verticalScrollSpeed.toString())
				.onChange(async (value) => {
					this.plugin.settings.verticalScrollSpeed = Math.clamp(parseInt(value), 1, 200);
					await this.plugin.saveSettings();
				}));
	}
}

