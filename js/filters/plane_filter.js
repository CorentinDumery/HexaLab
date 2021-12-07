"use strict";

// --------------------------------------------------------------------------------
// UI
// --------------------------------------------------------------------------------
// TODO use PlaneFilter namespace?
HexaLab.UI.plane_enabled        = $('#plane_enabled')
HexaLab.UI.plane_offset_slider  = $('#plane_offset_slider').slider()
HexaLab.UI.plane_offset_number  = $('#plane_offset_number')
HexaLab.UI.plane_nx             = $('#plane_nx')
HexaLab.UI.plane_ny             = $('#plane_ny')
HexaLab.UI.plane_nz             = $('#plane_nz')
HexaLab.UI.plane_snap_nx        = $('#plane_snap_nx')
HexaLab.UI.plane_snap_ny        = $('#plane_snap_ny')
HexaLab.UI.plane_snap_nz        = $('#plane_snap_nz')
HexaLab.UI.plane_swap           = $('#plane_swap_sign')
HexaLab.UI.plane_snap_camera    = $('#plane_snap_camera')
HexaLab.UI.plane_menu_content   = $('#plane_menu *')

HexaLab.UI.plane_menu_content.prop('disabled', true)
HexaLab.UI.plane_offset_slider.slider('disable')


// --------------------------------------------------------------------------------
// Filter class
// --------------------------------------------------------------------------------
HexaLab.PlaneFilter = function () {

    // Ctor
    HexaLab.Filter.call(this, new Module.PlaneFilter(), 'Plane');

    // Listener
    var self = this;
    HexaLab.UI.plane_enabled.change(function () {
        self.enable($(this).is(':checked'))
    })
    HexaLab.UI.plane_nx.change(function () {
        self.set_plane_normal(parseFloat(this.value), self.plane.normal.y, self.plane.normal.z)
    })
    HexaLab.UI.plane_ny.change(function () {
        self.set_plane_normal(self.plane.normal.x, parseFloat(this.value), self.plane.normal.z)
    })
    HexaLab.UI.plane_nz.change(function () {
        self.set_plane_normal(self.plane.normal.x, self.plane.normal.y, parseFloat(this.value))
    })
    HexaLab.UI.plane_offset_number.change(function () {
        self.set_plane_offset(parseFloat(this.value))
    })
    HexaLab.UI.plane_offset_slider.slider({
        min: 0,
        max: 1000
    }).on('slide', function (e, ui) {
        self.set_plane_offset(ui.value / 1000)
    }).on('slidestart', function(e, ui) {
        self.visible_color = true
        self.visible_edge = true
        self.update_visibility()
    }).on('slidestop', function(e, ui) {
        self.visible_color = false
        self.visible_edge = false
        self.update_visibility()
    })
    HexaLab.UI.plane_snap_nx.on('click', function () {
        self.set_plane_normal(1, 0, 0)
    })
    HexaLab.UI.plane_snap_ny.on('click', function () {
        self.set_plane_normal(0, 1, 0)
    })
    HexaLab.UI.plane_snap_nz.on('click', function () {
        self.set_plane_normal(0, 0, 1)
    })
    HexaLab.UI.plane_swap.on('click', function () {
		self.flip_plane();
    })

	HexaLab.UI.plane_snap_camera.on('dblclick', function (e) {
		self.toggle_auto_plane_normal_on_rotate()
    })
	
	HexaLab.UI.plane_snap_camera.on('click', function (e) {
		self.set_plane_normal_as_view(  e.ctrlKey || e.shiftKey || e.altKey , true  )
		self.disable_auto_plane_normal_on_rotate()
    })

    /*HexaLab.UI.plane_color.change(function () {
        self.set_plane_color($(this).val());
    })
    HexaLab.UI.plane_opacity.slider().on('slide', function (e, ui) {
        self.set_plane_opacity(ui.value / 100);
    })*/

    // State
    this.plane = {
        material: new THREE.MeshBasicMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        }),
        mesh: new THREE.Mesh(),
        edges: new THREE.LineSegments()
    };

    self.visible_color = false
    self.visible_edge = false

    this.default_settings = {
        enabled: false,
        normal: new THREE.Vector3(1, 0, 0),
        offset: 0,
        opacity: 0.05,
        color: "#56bbbb"
    }
};

HexaLab.PlaneFilter.prototype = Object.assign(Object.create(HexaLab.Filter.prototype), {

    // Api
    get_settings: function () {
        const n = this.backend.get_plane_normal()
        const s = {
            enabled: this.backend.enabled,
            normal: new THREE.Vector3(n.x(), n.y(), n.z()),
            offset: this.backend.get_plane_offset(),
            opacity: this.plane.material.opacity,
            color: '#' + this.plane.material.color.getHexString()
        }
        n.delete()
        return s
    },

    set_settings: function (settings) {
        this.enable(settings.enabled)
        this.set_plane_normal(settings.normal.x, settings.normal.y, settings.normal.z)
        this.set_plane_offset(settings.offset)
        this.set_plane_opacity(settings.opacity)
        this.set_plane_color(settings.color)
    },

    on_mesh_change: function (mesh) {
		this.nx = undefined;
        this.object_mesh = mesh

        HexaLab.app.viewer.remove_mesh(this.plane.mesh)
        HexaLab.app.viewer.remove_mesh(this.plane.edges)

        var geometry = new THREE.PlaneGeometry(this.object_mesh.get_aabb_diagonal(), this.object_mesh.get_aabb_diagonal());
        var edges = new THREE.EdgesGeometry(geometry)
        
        this.plane.mesh = new THREE.Mesh(geometry, this.plane.material);
        this.plane.edges = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
            color: this.plane.material.color,
            transparent: true,
            opacity: 0.0 // TODO differentiate between filter scene objects meshes and wireframe, draw meshes pre-ssao, wireframe post-ssao
        }))
        
        HexaLab.app.viewer.add_mesh(this.plane.mesh)
        HexaLab.app.viewer.add_mesh(this.plane.edges)

        this.update_visibility()

        this.set_plane_opacity(this.default_settings.opacity)
        this.set_plane_color(this.default_settings.color)

        this.on_enabled_set(this.backend.enabled)
        this.on_plane_normal_set(this.read_normal_from_backend())
        this.on_plane_offset_set(this.backend.get_plane_offset())

        this.update_mesh();

        HexaLab.UI.plane_menu_content.prop('disabled', false)
        HexaLab.UI.plane_offset_slider.slider('enable')
    },

    // misc

    read_normal_from_backend: function () {
        const n = this.backend.get_plane_normal()
        const v = new THREE.Vector3(n.x(), n.y(), n.z())
        n.delete()
        return v
    },

    // system -> UI

    on_enabled_set: function (bool) {
        HexaLab.UI.plane_enabled.prop('checked', bool)
    },

    on_plane_normal_set: function (normal) {
        HexaLab.UI.plane_nx.val(normal.x.toFixed(2))
        HexaLab.UI.plane_ny.val(normal.y.toFixed(2))
        HexaLab.UI.plane_nz.val(normal.z.toFixed(2))
    },

    on_plane_offset_set: function (offset) {
        HexaLab.UI.plane_offset_slider.slider('value', offset * 1000)
        HexaLab.UI.plane_offset_number.val(offset.toFixed(3))
    },

    // State

	nx : undefined,
	ny : undefined,
	nz : undefined,
	offset : 0,
	auto_set_normal : false,
	
    enable: function (enabled) {
        this.backend.enabled = enabled
        this.update_visibility()
        this.on_enabled_set(enabled)
        HexaLab.app.queue_buffers_update()
    },

    set_plane_normal: function (nx, ny, nz) {
		this.nx = nx;
		this.ny = ny;
		this.nz = nz;
        this.backend.set_plane_normal(nx, ny, nz)
        const normal = new THREE.Vector3(nx, ny, nz)
        this.on_plane_normal_set(normal)
        this.update_mesh()
        HexaLab.app.queue_buffers_update()
    },
	
	toggle_auto_plane_normal_on_rotate( ){
		this.auto_set_normal = ! this.auto_set_normal;
		if (this.auto_set_normal)
			HexaLab.UI.plane_snap_camera.addClass("checked");
		else 
			HexaLab.UI.plane_snap_camera.removeClass("checked");
	},
	
	disable_auto_plane_normal_on_rotate( ){
		this.auto_set_normal = false;
		HexaLab.UI.plane_snap_camera.removeClass("checked");
	},	
	
	flip_plane: function(){
		this.set_plane_normal(-this.nx,-this.ny,-this.nz)
		this.set_plane_offset( 1.0 - this.offset );
		//this.set_plane_offset(1 - this.backend.get_plane_offset())
	},
	set_plane_normal_as_view: function( snap_to_axis , maybe_flip){
		let camera_dir = new THREE.Vector3()            
        HexaLab.app.camera().getWorldDirection(camera_dir)
		if (!closest_axis && (maybe_flip===true)) {
			var dot = camera_dir.x*this.nx+camera_dir.y*this.ny+camera_dir.z*this.nz;
			if (dot<-0.9) {this.flip_plane(); return;}
		}
		
		var closest_axis = function( dir ){
			var m = Math.max( Math.abs(dir.x), Math.max( Math.abs(dir.y), Math.abs(dir.z) ) );
			if ( dir.x == m )  return  {x:1,y:0,z:0}
			if ( dir.x == -m ) return {x:-1,y:0,z:0}
			if ( dir.y == m )  return  {x:0,y:1,z:0}
			if ( dir.y == -m ) return {x:0,y:-1,z:0}
			if ( dir.z == m )  return  {x:0,y:0,z:1}
			/*if ( dir.z == -m )*/ return {x:0,y:0,z:-1}
		}
		
		if (snap_to_axis) {
			camera_dir = closest_axis( camera_dir );
		}
        this.set_plane_normal(camera_dir.x, camera_dir.y, camera_dir.z)
	},

	on_change_view: function() {
		if (this.offset==0) this.nx = undefined; // forget current cut plane
		else if (this.auto_set_normal) this.set_plane_normal_as_view(false);
		
	},
    set_plane_offset: function (offset) {
		this.offset = offset
		if (offset!=0 && this.nx == undefined) this.set_plane_normal_as_view( true )
        this.backend.set_plane_offset(offset)
        this.plane.world_offset = this.backend.get_plane_world_offset()
        this.on_plane_offset_set(offset)
        this.update_mesh()
        HexaLab.app.queue_buffers_update()
    },

    set_plane_opacity: function (opacity) {
        this.plane.material.opacity = opacity
        HexaLab.app.queue_canvas_update()
    },

    set_plane_color: function (color) {
        this.plane.material.color.set(color)
        HexaLab.app.queue_canvas_update()
    },

    update_visibility: function () {
        if (this.backend.enabled) {
            if (this.visible_color) {
                this.plane.mesh.visible = true
            } else {
                this.plane.mesh.visible = false
            }
            if (this.visible_edge) {
                this.plane.edges.visible = true
            } else {
                this.plane.edges.visible = false
            }
        } else {
            if (this.plane.mesh) this.plane.mesh.visible = false
            if (this.plane.edges) this.plane.edges.visible = false
        }
        HexaLab.app.queue_canvas_update()
    },

    update_mesh: function () {
        if (this.object_mesh) {
            for (var x of [this.plane.mesh, this.plane.edges]) {
                var pos = this.object_mesh.get_aabb_center()
                x.position.set(pos.x(), pos.y(), pos.z())
                //x.position.set(0, 0, 0)
                const n = this.backend.get_plane_normal()
                const normal = new THREE.Vector3(n.x(), n.y(), n.z())
                n.delete()
                var dir = new THREE.Vector3().addVectors(x.position, normal)
                x.lookAt(dir)
                x.translateZ(-this.plane.world_offset)
            }
        }
    }
});

HexaLab.filters.push(new HexaLab.PlaneFilter())
