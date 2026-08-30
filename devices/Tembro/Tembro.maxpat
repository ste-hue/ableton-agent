{
	"patcher" : {
		"fileversion" : 1,
		"appversion" : { "major" : 8, "minor" : 6, "revision" : 0, "architecture" : "x64", "modernui" : 1 },
		"classnamespace" : "box",
		"rect" : [ 100.0, 100.0, 640.0, 360.0 ],
		"openrect" : [ 0.0, 0.0, 620.0, 180.0 ],
		"openinpresentation" : 1,
		"boxes" : [
			{ "box" : { "id" : "obj-title", "maxclass" : "comment", "numinlets" : 1, "numoutlets" : 0, "patching_rect" : [ 20.0, 10.0, 120.0, 20.0 ], "presentation" : 1, "presentation_rect" : [ 8.0, 4.0, 120.0, 20.0 ], "text" : "Tembro" } },
			{ "box" : { "id" : "obj-status", "maxclass" : "message", "numinlets" : 2, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 300.0, 300.0, 300.0, 22.0 ], "presentation" : 1, "presentation_rect" : [ 130.0, 4.0, 482.0, 22.0 ], "text" : "starting…" } },
			{ "box" : { "id" : "obj-transcript", "maxclass" : "message", "numinlets" : 2, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 300.0, 260.0, 300.0, 22.0 ], "presentation" : 1, "presentation_rect" : [ 8.0, 32.0, 604.0, 60.0 ], "text" : "—" } },
			{ "box" : { "id" : "obj-input", "maxclass" : "textedit", "keymode" : 1, "numinlets" : 1, "numoutlets" : 4, "outlettype" : [ "", "int", "", "" ], "parameter_enable" : 0, "patching_rect" : [ 20.0, 60.0, 300.0, 40.0 ], "presentation" : 1, "presentation_rect" : [ 8.0, 100.0, 540.0, 44.0 ], "text" : "" } },
			{ "box" : { "id" : "obj-send", "maxclass" : "button", "numinlets" : 1, "numoutlets" : 1, "outlettype" : [ "bang" ], "patching_rect" : [ 340.0, 60.0, 24.0, 24.0 ], "presentation" : 1, "presentation_rect" : [ 556.0, 100.0, 44.0, 44.0 ] } },
			{ "box" : { "id" : "obj-sendlabel", "maxclass" : "comment", "numinlets" : 1, "numoutlets" : 0, "patching_rect" : [ 370.0, 62.0, 60.0, 20.0 ], "presentation" : 1, "presentation_rect" : [ 556.0, 148.0, 44.0, 20.0 ], "text" : "send" } },
			{ "box" : { "id" : "obj-prepend", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 20.0, 120.0, 100.0, 22.0 ], "text" : "prepend chat" } },
			{ "box" : { "id" : "obj-signin", "maxclass" : "message", "numinlets" : 2, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 140.0, 160.0, 180.0, 22.0 ], "presentation" : 1, "presentation_rect" : [ 8.0, 150.0, 180.0, 22.0 ], "text" : "signin dev@tembro.local" } },
			{ "box" : { "id" : "obj-statusreq", "maxclass" : "message", "numinlets" : 2, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 330.0, 160.0, 60.0, 22.0 ], "presentation" : 1, "presentation_rect" : [ 196.0, 150.0, 60.0, 22.0 ], "text" : "status" } },
			{ "box" : { "id" : "obj-node", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 2, "outlettype" : [ "", "" ], "patching_rect" : [ 20.0, 200.0, 340.0, 22.0 ], "saved_object_attributes" : { "autostart" : 1, "defer" : 0, "node_bin_path" : "", "npm_bin_path" : "", "watch" : 0 }, "text" : "node.script code/tembro_main.js @autostart 1 @watch 0" } },
			{ "box" : { "id" : "obj-route", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 4, "outlettype" : [ "", "", "", "" ], "patching_rect" : [ 20.0, 240.0, 220.0, 22.0 ], "text" : "route state status transcript" } },
			{ "box" : { "id" : "obj-setstatus", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 90.0, 280.0, 90.0, 22.0 ], "text" : "prepend set" } },
			{ "box" : { "id" : "obj-settranscript", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 160.0, 310.0, 90.0, 22.0 ], "text" : "prepend set" } },
			{ "box" : { "id" : "obj-clearinput", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 340.0, 100.0, 130.0, 22.0 ], "text" : "t bang" } },
			{ "box" : { "id" : "obj-clearmsg", "maxclass" : "message", "numinlets" : 2, "numoutlets" : 1, "outlettype" : [ "" ], "patching_rect" : [ 340.0, 130.0, 60.0, 22.0 ], "text" : "clear" } },
			{ "box" : { "id" : "obj-midiin", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 1, "outlettype" : [ "int" ], "patching_rect" : [ 520.0, 40.0, 50.0, 22.0 ], "text" : "midiin" } },
			{ "box" : { "id" : "obj-midiout", "maxclass" : "newobj", "numinlets" : 1, "numoutlets" : 0, "patching_rect" : [ 520.0, 80.0, 55.0, 22.0 ], "text" : "midiout" } }
		],
		"lines" : [
			{ "patchline" : { "source" : [ "obj-send", 0 ], "destination" : [ "obj-input", 0 ] } },
			{ "patchline" : { "source" : [ "obj-input", 0 ], "destination" : [ "obj-prepend", 0 ] } },
			{ "patchline" : { "source" : [ "obj-prepend", 0 ], "destination" : [ "obj-node", 0 ] } },
			{ "patchline" : { "source" : [ "obj-prepend", 0 ], "destination" : [ "obj-clearinput", 0 ] } },
			{ "patchline" : { "source" : [ "obj-clearinput", 0 ], "destination" : [ "obj-clearmsg", 0 ] } },
			{ "patchline" : { "source" : [ "obj-clearmsg", 0 ], "destination" : [ "obj-input", 0 ] } },
			{ "patchline" : { "source" : [ "obj-signin", 0 ], "destination" : [ "obj-node", 0 ] } },
			{ "patchline" : { "source" : [ "obj-statusreq", 0 ], "destination" : [ "obj-node", 0 ] } },
			{ "patchline" : { "source" : [ "obj-node", 0 ], "destination" : [ "obj-route", 0 ] } },
			{ "patchline" : { "source" : [ "obj-route", 1 ], "destination" : [ "obj-setstatus", 0 ] } },
			{ "patchline" : { "source" : [ "obj-setstatus", 0 ], "destination" : [ "obj-status", 0 ] } },
			{ "patchline" : { "source" : [ "obj-route", 2 ], "destination" : [ "obj-settranscript", 0 ] } },
			{ "patchline" : { "source" : [ "obj-settranscript", 0 ], "destination" : [ "obj-transcript", 0 ] } },
			{ "patchline" : { "source" : [ "obj-midiin", 0 ], "destination" : [ "obj-midiout", 0 ] } }
		],
		"dependency_cache" : [
			{ "name" : "tembro_main.js", "bootpath" : "~/devices/Tembro/code", "type" : "TEXT", "implicit" : 1 }
		]
	}
}
