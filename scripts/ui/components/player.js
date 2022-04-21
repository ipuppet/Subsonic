const {
    UIKit,
    FixedFooterView
} = require("../../lib/easy-jsbox")

class Artist {
    baseId = []
    artist = {}
    playNow = {}
    playIndex = 0
    palyList = []
    isStop = true
    loadFromHistory = false

    constructor(kernel) {
        this.kernel = kernel

        this.leftOffset = 15
        this.imageSize = 50
        this.height = 60
        this.miniControlWith = 75
        this.miniControlButtonSize = (this.miniControlWith - this.leftOffset) >> 1

        this.init()
    }

    init() {
        const lastPlay = $cache.get("lastPlay")
        const lastPlayIndex = $cache.get("lastPlayIndex")
        this.playIndex = lastPlayIndex ?? 0
        if (lastPlay) {
            this.loadFromHistory = true
            this.palyList = lastPlay
            this.playNow = this.palyList[this.playIndex]
        }
    }

    fixedFooterView(baseId, hasTabBar = false) {
        this.baseId.push(baseId)
        const fixedFooterView = new FixedFooterView({
            views: [
                UIKit.separatorLine(),
                { // image
                    type: "image",
                    props: {
                        id: this.baseId.at(-1) + "player-image",
                        src: this.kernel.subsonic.getCoverArt(this.playNow.coverArt)
                    },
                    layout: make => {
                        make.left.inset(this.leftOffset)
                        make.top.inset((this.height - this.imageSize) / 2)
                        make.size.equalTo(this.imageSize)
                    }
                },
                { // title
                    type: "view",
                    props: { clipsToBounds: true },
                    views: [
                        {
                            type: "label",
                            props: {
                                id: this.baseId.at(-1) + "player-title",
                                text: this.playNow.title,
                                lines: 1,
                                autoFontSize: true,
                                font: $font(18)
                            },
                            layout: (make, view) => {
                                make.top.left.equalTo(view.super)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: this.baseId.at(-1) + "player-artist",
                                text: this.playNow.artist,
                                lines: 1,
                                font: $font(14),
                                color: $color("secondaryText")
                            },
                            layout: (make, view) => {
                                make.left.equalTo(view.super)
                                make.bottom.equalTo(view.super)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.left.equalTo(view.prev.right).offset(this.leftOffset)
                        make.top.equalTo(view.prev).offset(5)
                        make.bottom.equalTo(view.prev).offset(-5)
                        make.right.inset(this.leftOffset).offset(-this.miniControlWith - this.leftOffset)
                    }
                },
                { // control
                    type: "view",
                    views: [
                        { // play pause
                            type: "button",
                            props: {
                                bgcolor: $color("clear"),
                                id: this.baseId.at(-1) + "control-play"
                            },
                            views: [
                                {
                                    type: "image",
                                    props: {
                                        symbol: $audio.status === 2 ? "pause.fill" : "play.fill"
                                    },
                                    layout: (make, view) => {
                                        make.size.equalTo($size(this.miniControlButtonSize - 10, this.miniControlButtonSize - 7))
                                        make.centerY.equalTo(view.super)
                                    }
                                }
                            ],
                            events: {
                                tapped: () => {
                                    if ($audio.status === 2) {
                                        this.pause()
                                    } else if (!this.isStop) {
                                        this.resume()
                                    } else {
                                        if (this.loadFromHistory) {
                                            this.play(this.palyList[this.playIndex])
                                        } else {
                                            this.kernel.subsonic.getRandomSongs().then(songs => {
                                                this.palyList = songs
                                                this.play(this.palyList[this.playIndex])
                                            }).catch(error => this.kernel.print(error))
                                        }
                                    }
                                }
                            },
                            layout: (make, view) => {
                                make.height.equalTo(view.super)
                                make.left.inset(5)
                            }
                        },
                        { // next
                            type: "button",
                            props: {
                                bgcolor: $color("clear")
                            },
                            views: [
                                {
                                    type: "image",
                                    props: {
                                        symbol: "forward.fill"
                                    },
                                    layout: (make, view) => {
                                        make.size.equalTo($size(this.miniControlButtonSize, this.miniControlButtonSize - 10))
                                        make.centerY.equalTo(view.super)
                                    }
                                }
                            ],
                            events: {
                                tapped: () => {
                                    this.next()
                                }
                            },
                            layout: (make, view) => {
                                make.height.equalTo(view.super)
                                make.left.equalTo(view.prev.right).offset(this.leftOffset - 5)
                            }
                        }
                    ],
                    layout: (make, view) => {
                        make.width.equalTo(this.miniControlWith)
                        make.height.equalTo(view.super)
                        make.right.inset(this.leftOffset)
                    }
                }
            ]
        })
        fixedFooterView.hasTabBar = hasTabBar
        return fixedFooterView
    }

    updatePlayNow() {
        $(this.baseId.at(-1) + "player-image").src = this.kernel.subsonic.getCoverArt(this.playNow.coverArt)
        $(this.baseId.at(-1) + "player-title").text = this.playNow.title
        $(this.baseId.at(-1) + "player-artist").text = this.playNow.artist
    }

    updateControlButton(isPause = $audio.status !== 2) {
        $(this.baseId.at(-1) + "control-play").get("image").symbol = isPause ? "play.fill" : "pause.fill"
    }

    insert(song) {
        for (let index = 0; index < this.palyList.length; index++) {
            if (this.palyList[index].id === song.id) {
                this.playIndex = index
                $cache.set("lastPlayIndex", this.playIndex)
                this.play(this.palyList[this.playIndex])
                return
            }
        }

        this.palyList.splice(this.playIndex, 0, song)
        $cache.set("lastPlay", this.palyList)
        this.play(this.palyList[this.playIndex])
    }

    stop() {
        this.isStop = true
        this.playIndex = 0
        $audio.stop()
        this.updateControlButton(1)
    }

    pause() {
        $audio.pause()
        this.updateControlButton(1)
    }

    resume() {
        $audio.resume()
        this.updateControlButton(0)
    }

    next() {
        if (this.playIndex < this.palyList.length) {
            ++this.playIndex
            this.play(this.palyList[this.playIndex])
        } else {
            this.stop()
        }
    }

    play(song) {
        const path = this.kernel.subsonic.song(song.id)
        const option = {}
        if (path.startsWith(this.kernel.fileStorage.basePath)) {
            option.path = path
        } else {
            option.url = path
        }
        option.events = {
            itemEnded: () => {
                console.log("itemEnded")
            },
            timeJumped: () => { },
            didPlayToEndTime: () => {
                console.log("didPlayToEndTime")
            },
            failedToPlayToEndTime: () => {
                console.log("failedToPlayToEndTime")
            },
            playbackStalled: () => {
                console.log("started")
            },
            newAccessLogEntry: () => {
                console.log("newAccessLogEntry")
            },
            newErrorLogEntry: () => {
                console.log("newErrorLogEntry")
            }
        }
        $audio.play(option)

        this.isStop = false
        this.playNow = song
        $cache.set("lastPlay", this.palyList)
        $cache.set("lastPlayIndex", this.playIndex)

        // UI
        this.updatePlayNow()
        this.updateControlButton(0)
    }
}

module.exports = Artist