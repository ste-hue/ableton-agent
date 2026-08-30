{
    "patcher": {
        "fileversion": 1,
        "appversion": {
            "major": 9,
            "minor": 1,
            "revision": 5,
            "architecture": "x64",
            "modernui": 1
        },
        "classnamespace": "box",
        "rect": [ 638.0, 216.0, 976.0, 361.0 ],
        "openrect": [ 0.0, 0.0, 420.0, 58.0 ],
        "openrectmode": 0,
        "openinpresentation": 1,
        "boxes": [
            {
                "box": {
                    "id": "obj-title",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 20.0, 10.0, 120.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 12.0, 7.0, 78.0, 20.0 ],
                    "text": "Tembro"
                }
            },
            {
                "box": {
                    "id": "obj-status",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 300.0, 300.0, 300.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 88.0, 7.0, 232.0, 22.0 ],
                    "text": "starting…"
                }
            },
            {
                "box": {
                    "id": "obj-transcript",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 300.0, 260.0, 300.0, 22.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 8.0, 32.0, 604.0, 22.0 ],
                    "text": "—"
                }
            },
            {
                "box": {
                    "id": "obj-input",
                    "keymode": 1,
                    "maxclass": "textedit",
                    "numinlets": 1,
                    "numoutlets": 4,
                    "outlettype": [ "", "int", "", "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 20.0, 60.0, 300.0, 40.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 8.0, 100.0, 540.0, 44.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-send",
                    "maxclass": "button",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 340.0, 60.0, 24.0, 24.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 556.0, 100.0, 44.0, 44.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-sendlabel",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 370.0, 62.0, 60.0, 20.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 556.0, 146.0, 44.0, 20.0 ],
                    "text": "send"
                }
            },
            {
                "box": {
                    "id": "obj-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 20.0, 120.0, 100.0, 22.0 ],
                    "text": "prepend chat"
                }
            },
            {
                "box": {
                    "id": "obj-email-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 0.0, 0.0, 150.0, 20.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 8.0, 146.0, 180.0, 20.0 ],
                    "text": "Email"
                }
            },
            {
                "box": {
                    "id": "obj-email",
                    "keymode": 1,
                    "maxclass": "textedit",
                    "numinlets": 1,
                    "numoutlets": 4,
                    "outlettype": [ "", "int", "", "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 140.0, 160.0, 180.0, 24.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 8.0, 164.0, 180.0, 28.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-license-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 0.0, 0.0, 150.0, 20.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 196.0, 146.0, 260.0, 20.0 ],
                    "text": "License or beta access code"
                }
            },
            {
                "box": {
                    "id": "obj-license",
                    "keymode": 1,
                    "maxclass": "textedit",
                    "numinlets": 1,
                    "numoutlets": 4,
                    "outlettype": [ "", "int", "", "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 330.0, 160.0, 180.0, 24.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 196.0, 164.0, 260.0, 28.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-activate",
                    "maxclass": "button",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 0.0, 0.0, 24.0, 24.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 466.0, 164.0, 28.0, 28.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-activate-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 0.0, 0.0, 150.0, 20.0 ],
                    "presentation": 0,
                    "presentation_rect": [ 500.0, 168.0, 100.0, 20.0 ],
                    "text": "connect"
                }
            },
            {
                "box": {
                    "id": "obj-authtrigger",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "bang", "bang" ],
                    "patching_rect": [ 140.0, 160.0, 45.0, 22.0 ],
                    "text": "t b b"
                }
            },
            {
                "box": {
                    "id": "obj-emailreg",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 190.0, 160.0, 50.0, 22.0 ],
                    "text": "zl reg"
                }
            },
            {
                "box": {
                    "id": "obj-licensereg",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 245.0, 160.0, 50.0, 22.0 ],
                    "text": "zl reg"
                }
            },
            {
                "box": {
                    "id": "obj-authpack",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 300.0, 160.0, 70.0, 22.0 ],
                    "text": "pack s s"
                }
            },
            {
                "box": {
                    "id": "obj-authprepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 375.0, 160.0, 100.0, 22.0 ],
                    "text": "prepend license"
                }
            },
            {
                "box": {
                    "id": "obj-statusreq",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 480.0, 160.0, 60.0, 22.0 ],
                    "text": "status"
                }
            },
            {
                "box": {
                    "id": "obj-node",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 20.0, 200.0, 340.0, 22.0 ],
                    "saved_object_attributes": {
                        "autostart": 0,
                        "defer": 0,
                        "watch": 0
                    },
                    "text": "node.script code/tembro_main.js @autostart 0 @watch 0"
                }
            },
            {
                "box": {
                    "id": "obj-route",
                    "maxclass": "newobj",
                    "numinlets": 4,
                    "numoutlets": 4,
                    "outlettype": [ "", "", "", "" ],
                    "patching_rect": [ 20.0, 240.0, 220.0, 22.0 ],
                    "text": "route state status transcript"
                }
            },
            {
                "box": {
                    "id": "obj-setstatus",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 90.0, 280.0, 90.0, 22.0 ],
                    "text": "prepend set"
                }
            },
            {
                "box": {
                    "id": "obj-settranscript",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 160.0, 310.0, 90.0, 22.0 ],
                    "text": "prepend set"
                }
            },
            {
                "box": {
                    "id": "obj-clearinput",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 340.0, 100.0, 130.0, 22.0 ],
                    "text": "t bang"
                }
            },
            {
                "box": {
                    "id": "obj-clearmsg",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 340.0, 130.0, 60.0, 22.0 ],
                    "text": "clear"
                }
            },
            {
                "box": {
                    "id": "obj-midiin",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 520.0, 40.0, 50.0, 22.0 ],
                    "text": "midiin"
                }
            },
            {
                "box": {
                    "id": "obj-midiout",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 520.0, 80.0, 55.0, 22.0 ],
                    "text": "midiout"
                }
            },
            {
                "box": {
                    "id": "obj-node-loadbang",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 370.0, 200.0, 60.0, 22.0 ],
                    "text": "loadbang"
                }
            },
            {
                "box": {
                    "id": "obj-node-delay",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 435.0, 200.0, 65.0, 22.0 ],
                    "text": "delay 500"
                }
            },
            {
                "box": {
                    "id": "obj-node-start",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 505.0, 200.0, 75.0, 22.0 ],
                    "text": "script start"
                }
            },
            {
                "box": {
                    "id": "obj-node-debug",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 260.0, 240.0, 120.0, 22.0 ],
                    "text": "prepend set"
                }
            },
            {
                "box": {
                    "id": "obj-open-button",
                    "maxclass": "button",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 620.0, 40.0, 30.0, 30.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 328.0, 8.0, 32.0, 32.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-open-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 655.0, 45.0, 90.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 364.0, 14.0, 54.0, 20.0 ],
                    "text": "open chat"
                }
            },
            {
                "box": {
                    "id": "obj-open-message",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 620.0, 80.0, 40.0, 22.0 ],
                    "text": "open"
                }
            },
            {
                "box": {
                    "id": "obj-pcontrol",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 665.0, 80.0, 55.0, 22.0 ],
                    "text": "pcontrol"
                }
            },
            {
                "box": {
                    "id": "obj-chat-patcher",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 620.0, 120.0, 110.0, 22.0 ],
                    "text": "p Tembro Chat",
                    "patcher": {
                        "fileversion": 1,
                        "appversion": {
                            "major": 9,
                            "minor": 1,
                            "revision": 5,
                            "architecture": "x64",
                            "modernui": 1
                        },
                        "classnamespace": "box",
                        "rect": [ 120.0, 120.0, 720.0, 640.0 ],
                        "openrect": [ 0.0, 0.0, 720.0, 640.0 ],
                        "openrectmode": 0,
                        "openinpresentation": 1,
                        "toolbarvisible": 0,
                        "boxes": [
                            {
                                "box": {
                                    "id": "chat-in",
                                    "index": 0,
                                    "maxclass": "inlet",
                                    "numinlets": 0,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 20.0, 20.0, 30.0, 30.0 ]
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-load-web",
                                    "maxclass": "newobj",
                                    "numinlets": 1,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 65.0, 24.0, 205.0, 22.0 ],
                                    "text": "loadmess readfile tembro_ui.html"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-web",
                                    "maxclass": "jweb",
                                    "numinlets": 1,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 20.0, 80.0, 680.0, 480.0 ],
                                    "presentation": 1,
                                    "presentation_rect": [ 0.0, 0.0, 720.0, 640.0 ],
                                    "rendermode": 0,
                                    "url": "file://tembro_ui.html",
                                    "varname": "tembro-web"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-route",
                                    "maxclass": "newobj",
                                    "numinlets": 6,
                                    "numoutlets": 6,
                                    "outlettype": [ "", "", "", "", "", "" ],
                                    "patching_rect": [ 20.0, 580.0, 300.0, 22.0 ],
                                    "text": "route chat license ui_ready status open_update"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-prepend-chat",
                                    "maxclass": "newobj",
                                    "numinlets": 1,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 270.0, 560.0, 85.0, 22.0 ],
                                    "text": "prepend chat"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-prepend-license",
                                    "maxclass": "newobj",
                                    "numinlets": 1,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 270.0, 590.0, 100.0, 22.0 ],
                                    "text": "prepend license"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-ui-ready",
                                    "maxclass": "message",
                                    "numinlets": 2,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 380.0, 560.0, 60.0, 22.0 ],
                                    "text": "ui_ready"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-status",
                                    "maxclass": "message",
                                    "numinlets": 2,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 380.0, 590.0, 50.0, 22.0 ],
                                    "text": "status"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-open-update",
                                    "maxclass": "message",
                                    "numinlets": 2,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 435.0, 590.0, 85.0, 22.0 ],
                                    "text": "open_update"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-out",
                                    "index": 0,
                                    "maxclass": "outlet",
                                    "numinlets": 1,
                                    "numoutlets": 0,
                                    "patching_rect": [ 460.0, 575.0, 30.0, 30.0 ]
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-resize-loadbang",
                                    "maxclass": "newobj",
                                    "numinlets": 1,
                                    "numoutlets": 1,
                                    "outlettype": [ "bang" ],
                                    "patching_rect": [ 500.0, 20.0, 60.0, 22.0 ],
                                    "text": "loadbang"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-resize-on",
                                    "maxclass": "message",
                                    "numinlets": 2,
                                    "numoutlets": 1,
                                    "outlettype": [ "" ],
                                    "patching_rect": [ 570.0, 20.0, 30.0, 22.0 ],
                                    "text": "1"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-resize-clock",
                                    "maxclass": "newobj",
                                    "numinlets": 2,
                                    "numoutlets": 1,
                                    "outlettype": [ "bang" ],
                                    "patching_rect": [ 610.0, 20.0, 75.0, 22.0 ],
                                    "text": "qmetro 150"
                                }
                            },
                            {
                                "box": {
                                    "id": "chat-resize-js",
                                    "maxclass": "newobj",
                                    "numinlets": 1,
                                    "numoutlets": 0,
                                    "patching_rect": [ 545.0, 50.0, 140.0, 22.0 ],
                                    "text": "v8 tembro_window.js"
                                }
                            }
                        ],
                        "lines": [
                            { "patchline": { "source": [ "chat-in", 0 ], "destination": [ "chat-web", 0 ] } },
                            { "patchline": { "source": [ "chat-load-web", 0 ], "destination": [ "chat-web", 0 ] } },
                            { "patchline": { "source": [ "chat-web", 0 ], "destination": [ "chat-route", 0 ] } },
                            { "patchline": { "source": [ "chat-route", 0 ], "destination": [ "chat-prepend-chat", 0 ] } },
                            { "patchline": { "source": [ "chat-route", 1 ], "destination": [ "chat-prepend-license", 0 ] } },
                            { "patchline": { "source": [ "chat-route", 2 ], "destination": [ "chat-ui-ready", 0 ] } },
                            { "patchline": { "source": [ "chat-route", 3 ], "destination": [ "chat-status", 0 ] } },
                            { "patchline": { "source": [ "chat-route", 4 ], "destination": [ "chat-open-update", 0 ] } },
                            { "patchline": { "source": [ "chat-prepend-chat", 0 ], "destination": [ "chat-out", 0 ] } },
                            { "patchline": { "source": [ "chat-prepend-license", 0 ], "destination": [ "chat-out", 0 ] } },
                            { "patchline": { "source": [ "chat-ui-ready", 0 ], "destination": [ "chat-out", 0 ] } },
                            { "patchline": { "source": [ "chat-status", 0 ], "destination": [ "chat-out", 0 ] } },
                            { "patchline": { "source": [ "chat-open-update", 0 ], "destination": [ "chat-out", 0 ] } },
                            { "patchline": { "source": [ "chat-resize-loadbang", 0 ], "destination": [ "chat-resize-on", 0 ] } },
                            { "patchline": { "source": [ "chat-resize-on", 0 ], "destination": [ "chat-resize-clock", 0 ] } },
                            { "patchline": { "source": [ "chat-resize-clock", 0 ], "destination": [ "chat-resize-js", 0 ] } }
                        ],
                        "autosave": 0
                    }
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "obj-authtrigger", 0 ],
                    "source": [ "obj-activate", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-authprepend", 0 ],
                    "source": [ "obj-authpack", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-authprepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-emailreg", 0 ],
                    "source": [ "obj-authtrigger", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-licensereg", 0 ],
                    "source": [ "obj-authtrigger", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-clearmsg", 0 ],
                    "source": [ "obj-clearinput", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-input", 0 ],
                    "source": [ "obj-clearmsg", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-emailreg", 1 ],
                    "source": [ "obj-email", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-authpack", 0 ],
                    "source": [ "obj-emailreg", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-prepend", 0 ],
                    "source": [ "obj-input", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-licensereg", 1 ],
                    "source": [ "obj-license", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-authpack", 1 ],
                    "source": [ "obj-licensereg", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-midiout", 0 ],
                    "source": [ "obj-midiin", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-route", 0 ],
                    "source": [ "obj-node", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-clearinput", 0 ],
                    "order": 0,
                    "source": [ "obj-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "order": 1,
                    "source": [ "obj-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-setstatus", 0 ],
                    "source": [ "obj-route", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-settranscript", 0 ],
                    "source": [ "obj-route", 2 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-input", 0 ],
                    "source": [ "obj-send", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-status", 0 ],
                    "source": [ "obj-setstatus", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-transcript", 0 ],
                    "source": [ "obj-settranscript", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-statusreq", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node-delay", 0 ],
                    "source": [ "obj-node-loadbang", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node-start", 0 ],
                    "source": [ "obj-node-delay", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-node-start", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node-debug", 0 ],
                    "source": [ "obj-node", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-status", 0 ],
                    "source": [ "obj-node-debug", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-open-message", 0 ],
                    "source": [ "obj-open-button", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-pcontrol", 0 ],
                    "source": [ "obj-open-message", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-chat-patcher", 0 ],
                    "source": [ "obj-pcontrol", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-chat-patcher", 0 ],
                    "source": [ "obj-node", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-node", 0 ],
                    "source": [ "obj-chat-patcher", 0 ]
                }
            }
        ],
        "dependency_cache": [
            {
                "name": "tembro_main.js",
                "bootpath": "code",
                "patcherrelativepath": "code",
                "type": "TEXT",
                "implicit": 1
            },
            {
                "name": "tembro_ui.html",
                "bootpath": ".",
                "patcherrelativepath": ".",
                "type": "TEXT",
                "implicit": 1
            },
            {
                "name": "tembro_window.js",
                "bootpath": ".",
                "patcherrelativepath": ".",
                "type": "TEXT",
                "implicit": 1
            }
        ],
        "autosave": 0,
        "oscreceiveudpport": 0
    }
}
