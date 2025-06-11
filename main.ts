import {App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder} from 'obsidian';

interface DiaryPluginSettings {
    diaryFolder: string;
    picFolder: string;
}

const DEFAULT_SETTINGS: DiaryPluginSettings = {
    diaryFolder: 'Daily Notes',
    picFolder: 'Images/Daily'
}

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