import { App, Plugin, PluginSettingTab, Setting, Notice, MarkdownView, Editor, TFile } from 'obsidian';
import { dirname, basename } from 'path';

// Remember to rename these classes and interfaces!

interface AssetsStructurePluginSettings {
	assetsFolderName: string;
}

const DEFAULT_SETTINGS: AssetsStructurePluginSettings = {
	assetsFolderName: 'Assets'
}

export default class AssetsStructurePlugin extends Plugin {
	settings: AssetsStructurePluginSettings;

	async onload() {
		await this.loadSettings();

		// Register handler function for editor paste event
		this.registerEvent(
			this.app.workspace.on("editor-paste", (evt: ClipboardEvent) => {
				if (!evt.defaultPrevented) {
					console.log("Clipboard data items greater than 1?");
					this.handlePaste(evt);
				}
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});
	}

	async handlePaste(evt: ClipboardEvent) {
		const editor: Editor | undefined = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!editor) {
			new Notice("ERROR: Cannot get markdown view editor");
			return;
		}

		const items: DataTransferItemList | undefined = evt.clipboardData?.items;
		if (!items) {
			new Notice("ERROR: Cannot get clipboard items");
			return;
		}

		if (items.length > 1) {
			console.log("Clipboard data items greater than 1?");
		}

		const file: File | null = items[0].getAsFile();
		if (!file) {
			return;
		}

		evt.preventDefault();

		await this.handleFilePaste(file, editor);
	}

	async handleFilePaste(file: File, editor: Editor) {
		const currentNote: TFile | null | undefined = this.app.workspace.activeEditor?.file;
		if (!currentNote) {
			new Notice( "ERROR: Cannot retrieve current note");
			return;
		}

		const assetsFolderNoteDir: string = `/${DEFAULT_SETTINGS.assetsFolderName}/` + dirname(currentNote.path);
		try {
			await this.app.vault.createFolder(assetsFolderNoteDir);
		} catch {
			console.log("Folder structure already exists");
		}
		
		const assetsFolderNotePath: string = assetsFolderNoteDir + "/" + "pasted" + Math.floor(Math.random() * 100000) + file.name;
		try {
			await this.app.vault.createBinary(assetsFolderNotePath, await file.arrayBuffer());
		} catch {
			console.log(`File ${basename(assetsFolderNotePath)} already exists`);
		}

		editor.replaceRange(`![[${basename(assetsFolderNotePath)}]]`, editor.getCursor());
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: AssetsStructurePlugin;

	constructor(app: App, plugin: AssetsStructurePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Assets folder name')
			.setDesc('Name of root folder where vault folder structure is mirrored for pasted external files organisation')
			.addText(text => text
				.setPlaceholder('unset')
				.setValue(this.plugin.settings.assetsFolderName)
				.onChange(async (value) => {
					this.plugin.settings.assetsFolderName = value;
					await this.plugin.saveSettings();
				}));
	}
}
