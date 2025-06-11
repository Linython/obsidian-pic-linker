import {App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder} from 'obsidian';

interface DiaryPluginSettings {
    diaryFolder: string;
    picFolder: string;
}

const DEFAULT_SETTINGS: DiaryPluginSettings = {
    diaryFolder: 'Daily Notes',
    picFolder: 'Images/Daily'
}

// export default class MyPlugin extends Plugin {
// 	settings: DiaryPluginSettings;
//
// 	async onload() {
// 		await this.loadSettings();
//
// 		// This creates an icon in the left ribbon.
// 		const ribbonIconEl = this.addRibbonIcon('image', 'pic-linker', (evt: MouseEvent) => {
// 			// Called when the user clicks the icon.
// 			new Notice('This is pic-linker!');
// 		});
// 		// Perform additional things with the ribbon
// 		ribbonIconEl.addClass('my-plugin-ribbon-class');
//
// 		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
// 		const statusBarItemEl = this.addStatusBarItem();
// 		statusBarItemEl.setText('Status Bar Text');
//
// 		// This adds a simple command that can be triggered anywhere
// 		this.addCommand({
// 			id: 'open-sample-modal-simple',
// 			name: 'Open sample modal (simple)',
// 			callback: () => {
// 				new SampleModal(this.app).open();
// 			}
// 		});
// 		// This adds an editor command that can perform some operation on the current editor instance
// 		this.addCommand({
// 			id: 'sample-editor-command',
// 			name: 'Sample editor command',
// 			editorCallback: (editor: Editor, view: MarkdownView) => {
// 				console.log(editor.getSelection());
// 				editor.replaceSelection('Sample Editor Command');
// 			}
// 		});
// 		// This adds a complex command that can check whether the current state of the app allows execution of the command
// 		this.addCommand({
// 			id: 'open-sample-modal-complex',
// 			name: 'Open sample modal (complex)',
// 			checkCallback: (checking: boolean) => {
// 				// Conditions to check
// 				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
// 				if (markdownView) {
// 					// If checking is true, we're simply "checking" if the command can be run.
// 					// If checking is false, then we want to actually perform the operation.
// 					if (!checking) {
// 						new SampleModal(this.app).open();
// 					}
//
// 					// This command will only show up in Command Palette when the check function returns true
// 					return true;
// 				}
// 			}
// 		});
//
// 		// This adds a settings tab so the user can configure various aspects of the plugin
// 		// this.addSettingTab(new SampleSettingTab(this.app, this));
//
// 		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
// 		// Using this function will automatically remove the event listener when this plugin is disabled.
// 		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
// 			console.log('click', evt);
// 		});
//
// 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
// 		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
// 	}
//
// 	onunload() {
//
// 	}
//
// 	async loadSettings() {
// 		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// 	}
//
// 	async saveSettings() {
// 		await this.saveData(this.settings);
// 	}
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}
//
// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}
//
// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;
//
// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}
//
// 	display(): void {
// 		const {containerEl} = this;
//
// 		containerEl.empty();
//
// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }


export default class DiaryPlugin extends Plugin {
    settings: DiaryPluginSettings;

    async onload() {
        await this.loadSettings();

        // 添加设置选项卡
        this.addSettingTab(new DiarySettingTab(this.app, this));

        const ribbonIconEl = this.addRibbonIcon('image', 'pic-linker', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is pic-linker!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // 监听文件创建事件（日记创建）
        this.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file instanceof TFile && this.isDiaryFile(file)) {
                    this.addMatchingImages(file);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('create', (file) => {
                if (file instanceof TFile && file.parent?.path === this.settings.picFolder) {
                    this.updateAllDiaries();
                }
            })
        );
    }

    isDiaryFile(file: TFile): boolean {
        return file.parent?.path === this.settings.diaryFolder &&
            file.extension === 'md';
    }

    async addMatchingImages(diaryFile: TFile) {
        const diaryName = diaryFile.basename;
        const picFolder = this.app.vault.getAbstractFileByPath(this.settings.picFolder);

        if (!(picFolder instanceof TFolder)) return;

        const matchingImages: string[] = [];

        // 查找匹配的图片
        for (const file of picFolder.children) {
            if (file instanceof TFile && this.isImageFile(file)) {
                if (file.basename.includes(diaryName) || diaryName.includes(file.basename)) {
                    matchingImages.push(`[[${file.name}]]`);
                }
            }
        }

        if (matchingImages.length > 0) {
            const content = await this.app.vault.read(diaryFile);
            const newContent = matchingImages.join(' ') + '\n\n' + content;
            await this.app.vault.modify(diaryFile, newContent);
        }
    }

    isImageFile(file: TFile): boolean {
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'];
        return imageExtensions.includes(file.extension.toLowerCase());
    }

    async onPicFolderChange() {
        // 图片文件夹变化时更新所有日记
        await this.updateAllDiaries();
    }

    async updateAllDiaries() {
        const diaryFolder = this.app.vault.getAbstractFileByPath(this.settings.diaryFolder);
        if (!(diaryFolder instanceof TFolder)) return;

        for (const file of diaryFolder.children) {
            if (file instanceof TFile && file.extension === 'md') {
                await this.addMatchingImages(file);
            }
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class DiarySettingTab extends PluginSettingTab {
    plugin: DiaryPlugin;

    constructor(app: App, plugin: DiaryPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('日记文件夹')
            .setDesc('存放所有日记文件的文件夹')
            .addText(text => text
                .setPlaceholder('Daily Notes')
                .setValue(this.plugin.settings.diaryFolder)
                .onChange(async (value) => {
                    this.plugin.settings.diaryFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('图片文件夹')
            .setDesc('存放日记相关图片的文件夹')
            .addText(text => text
                .setPlaceholder('Images/Daily')
                .setValue(this.plugin.settings.picFolder)
                .onChange(async (value) => {
                    this.plugin.settings.picFolder = value;
                    await this.plugin.saveSettings();
                    await this.plugin.onPicFolderChange();
                }));
    }
}