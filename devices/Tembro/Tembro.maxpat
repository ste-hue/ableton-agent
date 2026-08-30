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
        "openrect": [ 0.0, 0.0, 620.0, 210.0 ],
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
                    "presentation_rect": [ 8.0, 4.0, 120.0, 20.0 ],
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
                    "presentation_rect": [ 130.0, 4.0, 482.0, 22.0 ],
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
                    "presentation": 1,
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
                    "presentation": 1,
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
                    "presentation": 1,
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
                    "presentation": 1,
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
                    "presentation": 1,
                    "presentation_rect": [ 8.0, 146.0, 180.0, 20.0 ],
                    "text": "Purchase email"
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
                    "presentation": 1,
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
                    "presentation": 1,
                    "presentation_rect": [ 196.0, 146.0, 260.0, 20.0 ],
                    "text": "License key"
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
                    "presentation": 1,
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
                    "presentation": 1,
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
                    "presentation": 1,
                    "presentation_rect": [ 500.0, 168.0, 100.0, 20.0 ],
                    "text": "activate"
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
            }
        ],
        "dependency_cache": [
            {
                "name": "tembro_main.js",
                "bootpath": "code",
                "patcherrelativepath": "code",
                "type": "TEXT",
                "implicit": 1
            }
        ],
        "autosave": 0,
        "oscreceiveudpport": 0
    }
}
