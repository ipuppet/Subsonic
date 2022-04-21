const {
    versionCompare,
    Sheet,
    TabBarController,
    Kernel,
    FileStorage,
    Setting
} = require("./lib/easy-jsbox")
const Subsonic = require("./lib/subsonic")
const Home = require("./ui/home")
const Player = require("./ui/components/player")

const fileStorage = new FileStorage()

class AppKernel extends Kernel {
    constructor() {
        super()
        this.query = $context.query
        // FileStorage
        this.fileStorage = fileStorage
        // Setting
        this.setting = new Setting({ fileStorage: this.fileStorage })
        this.setting.loadConfig()
        this.initSettingMethods()
        // Subsonic
        this.subsonic = new Subsonic({
            host: this.setting.get("host"),
            username: this.setting.get("username"),
            password: this.setting.get("password"),
            fileStorage: new FileStorage({ basePath: fileStorage.basePath + "/tmp" })
        })
        this.initComponents()
    }

    initComponents() {
        // Clipboard
        this.home = new Home(this)
        // player
        this.player = new Player(this)
    }

    deleteConfirm(message, conformAction) {
        $ui.alert({
            title: message,
            actions: [
                {
                    title: $l10n("DELETE"),
                    style: $alertActionType.destructive,
                    handler: () => {
                        conformAction()
                    }
                },
                { title: $l10n("CANCEL") }
            ]
        })
    }

    /**
     * 注入设置中的脚本类型方法
     */
    initSettingMethods() {
        this.setting.method.readme = animate => {
            animate.touchHighlight()
            const content = $file.read("/README.md").string
            const sheet = new Sheet()
            sheet
                .setView({
                    type: "markdown",
                    props: { content: content },
                    layout: (make, view) => {
                        make.size.equalTo(view.super)
                    }
                })
                .init()
                .present()
        }

        this.setting.method.checkUpdate = animate => {
            animate.actionStart()
            this.checkUpdate(content => {
                $file.write({
                    data: $data({ string: content }),
                    path: "scripts/lib/easy-jsbox.js"
                })
                $ui.toast("The framework has been updated.")
            })
            $http.get({
                url: "https://raw.githubusercontent.com/ipuppet/Subsonic/master/config.json",
                handler: resp => {
                    const version = resp.data?.info.version
                    const config = JSON.parse($file.read("config.json").string)
                    if (versionCompare(version, config.info.version) > 0) {
                        $ui.alert({
                            title: "New Version",
                            message: `New version found: ${version}\nUpdate via Github or click the button to open Erots.`,
                            actions: [
                                { title: $l10n("CANCEL") },
                                {
                                    title: "Erots",
                                    handler: () => {
                                        $addin.run({
                                            name: "Erots",
                                            query: {
                                                "q": "show",
                                                "objectId": ""
                                            }
                                        })
                                    }
                                }
                            ]
                        })
                    } else {
                        $ui.toast("No need to update")
                    }
                    animate.actionDone()
                }
            })
        }

        this.setting.method.clearCache = animate => {
            animate.touchHighlight()
            $ui.alert({
                title: $l10n("CLEAR_CACHE"),
                message: $l10n("CLEAR_CACHE_MESSAGE"),
                actions: [
                    {
                        title: $l10n("CLEAR"),
                        style: $alertActionType.destructive,
                        handler: () => {
                            conformAction()
                        }
                    },
                    { title: $l10n("CANCEL") }
                ]
            })
        }
    }
}

class AppUI {
    static renderMainUI() {
        const kernel = new AppKernel()
        const buttons = {
            home: {
                icon: "square.stack",
                title: $l10n("LIBRARY")
            },
            setting: {
                icon: "gear",
                title: $l10n("SETTING")
            }
        }

        kernel.tabBarController = new TabBarController()
        const homePageController = kernel.home.getPageController()
        kernel.home.viewController.setRootPageController(homePageController)
        kernel.tabBarController.setPages({
            home: homePageController.getPage(),
            setting: kernel.setting.getPageView()
        }).setCells({
            home: buttons.home,
            setting: buttons.setting
        })

        kernel.UIRender(kernel.tabBarController.generateView().definition)
    }

    static renderUnsupported() {
        $intents.finish("不支持在此环境中运行")
        $ui.render({
            views: [{
                type: "label",
                props: {
                    text: "不支持在此环境中运行",
                    align: $align.center
                },
                layout: $layout.fill
            }]
        })
    }
}

module.exports = {
    run: () => {
        if ($app.env === $env.app || $app.env === $env.action) {
            AppUI.renderMainUI()
        } else {
            AppUI.renderUnsupported()
        }
    }
}