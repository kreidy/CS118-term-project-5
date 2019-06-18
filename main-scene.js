import {tiny, defs} from './assignment-4-resources.js';
                                                                // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Shader, Material, Texture,
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base, Tetrahedron } = defs;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and assignment-4-resources.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// we can use an array of particles to keep track of every particle in our scene
// each particle will have a position, a velocity,
//    and a goal location where the particle wants to be
// these can each be represented by a Vec3
class Particle {
      constructor(position, velocity, goal, life, earth_size) {
            this.goal = goal;
            this.life = life;

            // fluid attributes
            this.position = position;
            this.velocity = velocity;
            this.force = Vec.of(0,0,0);
            this.density = 0;
            this.pressure = 0;
            this.earth_size = earth_size;
      }
}

const particles_per_box = 30;
const starting_life = 300;

// (Can define Main_Scene's class here)

const Main_Scene =
class Particle_Scene extends Scene
{
  constructor()
    {                  
      super();

      const Subdivision_Sphere_Flat = Subdivision_Sphere.prototype.make_flat_shaded_version();


      this.shapes = { 'box' : new Cube(),
                   'ball_1' : new Subdivision_Sphere( 1 ),
                   'ball_2' : new Subdivision_Sphere( 2 ),
                   'ball_3' : new Subdivision_Sphere_Flat( 3 ),
                   'ball_4' : new Subdivision_Sphere( 4 ),
                   'ball_5' : new Subdivision_Sphere( 5 ),
                   'ball_6' : new Subdivision_Sphere( 6 ),
                   'tet'    : new Tetrahedron(),
                    };

                                                              // *** Shaders ***

                                                              // NOTE: The 2 in each shader argument refers to the max
                                                              // number of lights, which must be known at compile time.

                                                              // A simple Phong_Blinn shader without textures:
      const phong_shader      = new defs.Phong_Shader  (2);
                                                              // Adding textures to the previous shader:
      const texture_shader    = new defs.Textured_Phong(2);
                                                              // Same thing, but with a trick to make the textures
                                                              // seemingly interact with the lights:
      const texture_shader_2  = new defs.Fake_Bump_Map (2);
                                                              // A Simple Gouraud Shader that you will implement:
	  const rock_shader       = new Rock_Shader();
                                              // *** Materials: *** wrap a dictionary of "options" for a shader.

                                              // TODO (#2):  Complete this list with any additional materials you need:

      this.materials = { plastic: new Material( phong_shader,
                                    { ambient: 1, diffusivity: 1, specularity: 0, color: Color.of( 1,.5,1,1 ) } ),
                           metal: new Material( phong_shader,
                                    { ambient: 0, diffusivity: 1, specularity: 1, color: Color.of( 1,.5,1,1 ) } ),
                           rock: new Material( rock_shader,
                                    { ambient: 1, diffusivity: 0.9, specularity: 0.1, color: Color.of( .75,.75,.75,1 ) } ),
                           dirt: new Material( phong_shader,
                                    { ambient: 1, diffusivity: 0.9, specularity: 0.1, color: Color.of( .6,.6,.6,1 ) } ),
                       };




      // GLOBAL VARIABLES

      // variables for sizing
      this.num_particles = 0;
      this.scale_val = 1;
      this.num_scales = 0;
      this.scale_vec = Vec.of(1, 1, 1);
      this.max_radius = 3*this.scale_val; // arbitrary function to determine max_radius

      // variables for mouse controls
      this.mouse_enabled_canvases = new Set();
      this.mouse_pos = Vec.of(1,1,1);             // 3D vector representing position of vector when clicked

      // variables for movement
      this.click_time = 0;              // grabs the program_state.animation_time at the point when the mouse is clicked
      this.is_paused = false;

      // variables for reaction speed
      this.reaction_speed = 1000;

      // variables for regeneration
      this.cluster_origin = Vec.of(0,0,0);
      this.regeneration_enabled = true;

      // variable for element setting, by default --> water
      this.element_setting = "Water";
      this.is_spout_demo = false;
      this.fire_acc_vec = Vec.of(0, 9.8, 0);

      // variable to keep track of position of each individual particle in scene
      // - store central vertices of each particle here
      this.particle_positions = [];

      // variables to keep track of particles
      // particles are stored in boxes of particles_per_box particles each
      // this allows for much faster collision calculations, since particles only
      //   react to particles in their own "box," and not every single particle
      this.particle_boxes = [];
      this.particle_boxes.push([]);
      this.particles = this.particle_boxes[0];
      this.add_particle();


      //variables for earth particle colors
      this.clay_colors =[];
      for (let i = 0; i<40; i++ ){
      	let red = this.get_random_coord(0.4, 0.5);
      	this.clay_colors.push(Color.of(red,red/2,0,1));
      }
      this.rock_colors =[];
      for (let i = 0; i<40; i++ ){
      	let red = this.get_random_coord(0.4, 0.5);
      	let green = this.get_random_coord(0.5,0.95)*red;
      	let blue = this.get_random_coord(0.95,1)*green;
      	this.rock_colors.push(Color.of(red,green,blue,1));
      }

    }
  make_control_panel()
    {             
    	// BUTTONS FOR DIFFERENT ELEMENTS
    	this.live_string( box => { box.textContent = "Select an Element: " + this.element_setting } );
        this.new_line();
        this.key_triggered_button("Earth", ["e"], () => {this.element_setting = "Earth"; this.is_spout_demo = false; this.regeneration_enabled = true;}, "brown" );
        this.key_triggered_button("Air", ["a"], () => {this.element_setting = "Air"; this.is_spout_demo = false; this.regeneration_enabled = true;}, "black" );
        this.key_triggered_button("Fire", ["f"], () => {this.element_setting = "Fire"; this.is_spout_demo = false; this.regeneration_enabled = true;}, "orange" );
        this.key_triggered_button( "Water" , [ "w" ], () => { this.element_setting = "Water"; }, "blue" );
        this.new_line();
        this.key_triggered_button("Spout demo", ["s"], () =>
        {
        	if (this.element_setting === "Water") {
        		this.is_spout_demo = !this.is_spout_demo;
        		this.regeneration_enabled = !this.regeneration_enabled;
        	}
        })
       	this.new_line();
       	                    
       // BUTTONS FOR SIZING
       this.new_line();
       this.live_string( box => { box.textContent = "Adjust Particle Features"  } );
       this.new_line();
       this.key_triggered_button( "Increase Size", [ "i" ], () =>
        {
          this.num_scales += 1;
          this.scale_val = 1 * (1.1 ** this.num_scales);
          this.max_radius *= this.scale_val;    // recalculate max_radius
          this.scale_vec = Vec.of(this.scale_val, this.scale_val, this.scale_val);
        }  );
        this.key_triggered_button( "Decrease Size", [ "o" ], () =>
        {
          this.num_scales -= 1;
          this.scale_val = 1 * (1.1 ** this.num_scales);
          this.max_radius *= this.scale_val;    // recalculate max_radius
          this.scale_vec = Vec.of(this.scale_val, this.scale_val, this.scale_val);
        }  );
        this.new_line();

        // BUTTONS FOR NUMBER OF PARTICLES
        this.key_triggered_button( "Increase Number of Particles", [ "=" ], () =>
          {
            this.add_particle();
          });
        this.key_triggered_button( "Increase Number of Particles (x5)", [ "]" ], () =>
          {
            for (let i = 0; i < 5; i++) {
              this.add_particle();
            }
          });
        this.new_line();
        this.key_triggered_button( "Decrease Number of Particles", [ "-" ], () =>
          {
            if (this.num_particles > 1) {
              this.remove_particle();
            }
          });
        this.key_triggered_button( "Decrease Number of Particles (x5)", [ "[" ], () =>
          {
            let i = 5;
            while (i > 0 && this.num_particles > 1) {
              i--;
              this.remove_particle();
            }
          });
        this.new_line();
        this.live_string( box => { box.textContent = "Number of Particles: " + this.num_particles } );
        this.new_line();

        // BUTTONS FOR REACTION SPEED
        this.key_triggered_button( "Increase Reaction Speed of Particles", [ "8" ], () =>
          {
              this.reaction_speed = this.reaction_speed / 2;
          });
        this.key_triggered_button( "Decrease Reaction Speed of Particles", [ "7" ], () =>
          {
              this.reaction_speed = this.reaction_speed * 2;
          });
        this.new_line();
        this.live_string( box => { box.textContent = "Reaction Speed: " + this.reaction_speed } );
        this.new_line();
        // RESET
        this.key_triggered_button( "Reset Particles", ["q"], () =>
       {
       	// get rid of all but one particle
       	let num_particles = this.num_particles;
         for (let i = 0; i < num_particles - 1; i++) {
         	this.remove_particle();
         }
         this.scale_val = 1;
         this.num_scales = 0;
      	 this.scale_vec = Vec.of(1, 1, 1);
      	 this.max_radius = this.scale_val*3; // arbitrary function to determine max_radius
      	 this.element_setting = "Water";
      	 this.reaction_speed = 1000;
      	 this.cluster_origin = Vec.of(0,0,0);
      	 this.regeneration_enabled = true;
       } );	

       this.new_line();
       this.new_line();
        this.key_triggered_button( "Next frame", ["v"], () =>
            {
                this.updatePositions();
            } );
        this.key_triggered_button( "Pause", ["c"], () =>
            {
                this.is_paused = !this.is_paused;
            } );
        this.new_line();												 

    }

    updatePositions() {
        for (let b = 0; b < this.particle_boxes.length; b++) {
        let cur_box = this.particle_boxes[b];

        for (let i = 0; i < cur_box.length; i++) {
          let cur_particle = cur_box[i];

          if (isNaN(cur_particle.position[0] + cur_particle.position[1]))
          	console.log('nan');
          cur_particle.position = cur_particle.position.plus( cur_particle.velocity );
            //  consider adjusting position as a function of velocity AND framerate
            //  this could avoid slowdown problems as the number of particles increases

          if (isNaN(cur_particle.position[0] + cur_particle.position[1]))
          	console.log('nan');

          if (this.element_setting == "Water") {
          	if (cur_particle.position[0] < -19) {
          		cur_particle.position[0] = -19;
          		cur_particle.velocity[0] *= -0.5;
          		cur_particle.velocity[2] -= .01
          	}
          	else if (cur_particle.position[0] < -18) {
          		cur_particle.velocity[0] += .05;
          		cur_particle.velocity[2] -= .02
          	}

          	if (cur_particle.position[0] > 19) {
          		cur_particle.position[0] = 19;
          		cur_particle.velocity[0] *= -0.5;
          		cur_particle.velocity[2] += .01
          	}
			else if (cur_particle.position[0] > 18) {
				cur_particle.velocity[0] -= .05;
				cur_particle.velocity[2] += .02
			}

          	if (cur_particle.position[1] < -10) {
          		cur_particle.position[1] = -10;
          		cur_particle.velocity[1] *= -0.4;
          		cur_particle.velocity[0] *= 1.01;
          	}

			if (cur_particle.position[2] < -15) {
          		cur_particle.position[2] = -15;
          		cur_particle.velocity[2] *= -0.5;
          		cur_particle.velocity[0] += .01;
			}
			else if (cur_particle.position[2] < -14) {
				cur_particle.velocity[2] += .05;
				cur_particle.velocity[0] += .02;
			}
			
			if (cur_particle.position[2] > 2) {
          		cur_particle.position[2] = 2;
          		cur_particle.velocity[2] *= -0.5;
          		cur_particle.velocity[0] -= .01;
			}
			else if (cur_particle.position[2] > 1) {
				cur_particle.velocity[2] -= .05;
				cur_particle.velocity[0] -= .02;
			}
          }

          if (cur_particle.life <= 0 && this.regeneration_enabled) {
            this.regenerate_particle(b, i);
          }
          if (!this.is_spout_demo)
          	if (this.element_setting === "Fire"){
          		cur_particle.life -= 2;
          	}
          	cur_particle.life--;

          let acc_vec = Vec.of(0,-0.01,0);
          for (let j = 0; j < cur_box.length; j++) {
            if (i != j) {
              let j_particle = cur_box[j];
              let itoj = j_particle.position.minus( cur_particle.position );
              let dist = itoj.norm();
              if (dist == 0) {
              	cur_particle.position = cur_particle.position.plus( Vec.of(-0.01, this.scale_val, 0));
              	itoj = j_particle.position.minus( cur_particle.position );
              	dist = itoj.norm();
              }
              else if (dist < this.scale_val*2) {
                  cur_particle.position = cur_particle.position.minus( itoj.normalized().times(this.scale_val) );
                  itoj = j_particle.position.minus( cur_particle.position );
                  dist = itoj.norm();
              }

              // calculate lennard jones potential force strength from this particle
              // used the formula from https://en.wikibooks.org/wiki/Molecular_Simulation/The_Lennard-Jones_Potential
              // used epsilon = 1 kJ/mol
              // scales smoothly as a function of num_particles, consider removing extra 2 term
              
              let lj_strength = ((this.scale_val * 2 * (50 + this.num_particles) / (55 * dist)) ** 12)
                                  - 2 * ((this.scale_val * 2 * (50 + this.num_particles) / (55 * dist)) ** 6);
                                  
	
              acc_vec = acc_vec.plus( itoj.normalized().times(lj_strength / 5) )
              				   .plus( j_particle.velocity.times(((50-dist)**2)/6000000) );
              if(isNaN(acc_vec[0] + acc_vec[1] + acc_vec[2]))
              	console.log('nan');
            }
          }

// 		  // if not in water mode, consider goal
 		  if (!this.is_spout_demo) {
			  let to_goal = cur_particle.goal.minus( cur_particle.position );
			  if (to_goal.equals(Vec.of(0,0,0))) {
				cur_particle.velocity = Vec.of(0,0,0);
			  }
			  else {
				cur_particle.velocity = to_goal.normalized().times( 0.025 * 1000 / this.reaction_speed * to_goal.norm() );
				for (let k = 0; k < 3; k++)
					if (isNaN(cur_particle.velocity[k]))
						cur_particle.velcity[k] = 0;
			  }
 		  }

          cur_particle.velocity = cur_particle.velocity.times(0.98).plus(acc_vec);
          if (this.is_spout_demo && cur_particle.position[1] < -9.9 && cur_particle.velocity.norm() > 1)
          	cur_particle.velocity.scale(0.9)
          if (isNaN(cur_particle.velocity[0]))
          	console.log('nan');

            // normalize velocities that are too large, since these are bugs
            // that cause some particles to jump way out of place
          if (cur_particle.velocity.norm() > 2) {
            cur_particle.velocity = cur_particle.velocity.normalized().times(2);
          }
        }
       }
    }

    // functions to add or remove particles from the arrays
    add_particle() {
      this.num_particles++;
      if (this.num_particles % particles_per_box == 1) {
        this.particle_boxes.push([]);
        this.particles = this.particle_boxes[Math.floor(this.num_particles / particles_per_box)];
      }

	  let x_pos = this.get_random_coord(this.cluster_origin[0], this.max_radius);
      let y_pos = this.get_random_coord(this.cluster_origin[1], this.max_radius);
      let z_pos = this.get_random_coord(this.cluster_origin[2], this.max_radius);
      let position = Vec.of(x_pos, y_pos, z_pos);
      let velocity = Vec.of(0,0,0);
      if (this.is_spout_demo) {
      	position = Vec.of(-15, 5, 0);
      	velocity = Vec.of(1.2,(Math.random()-0.5)*0.5,0);
      }
      let random_x_size = Math.random() * 0.6 + 0.4; // random scale val betwen 0.4 and 1.0
      let random_y_size = Math.random() * 0.6 + 0.4; // random scale val betwen 0.4 and 1.0
      let random_z_size = Math.random() * 0.6 + 0.4; // random scale val betwen 0.4 and 1.0
      this.particles.push( new Particle(position, velocity, position, starting_life, Vec.of(random_x_size, random_y_size, random_z_size)) );


      // add position of particle into this.particle_positions
      this.particle_positions.push(position);
    }
    remove_particle() {
      this.num_particles--;
      this.particles.pop();
      if (this.num_particles % particles_per_box == 0) {
        this.particle_boxes.pop();
        this.particles = this.particle_boxes[Math.floor((this.num_particles - 1) / particles_per_box)];
      }

      this.particle_positions.pop();
    }
    regenerate_particle(b, i) {

      // remove position of first particle in list
      this.particle_positions.shift();

      let x_pos = this.get_random_coord(this.cluster_origin[0], this.max_radius);
      let y_pos = this.get_random_coord(this.cluster_origin[1], this.max_radius);
      let z_pos = this.get_random_coord(this.cluster_origin[2], this.max_radius);
      let position = Vec.of(x_pos, y_pos, z_pos);
      let velocity = Vec.of(0,0,0);
      if (this.is_spout_demo) {
      	position = Vec.of(-15, 5, 0);
      	velocity = Vec.of(1.2,0,0);
      }
      let random_x_size = Math.random() * 0.6 + 0.4; // random scale val betwen 0.4 and 1.0
      let random_y_size = Math.random() * 0.6 + 0.4; // random scale val betwen 0.4 and 1.0
      let random_z_size = Math.random() * 0.6 + 0.4; // random scale val betwen 0.4 and 1.0
      let new_part = new Particle(position, velocity, position, starting_life, Vec.of(random_x_size, random_y_size, random_z_size));

      this.particle_boxes[b].splice(i, 1, new_part);   // remove very first particle aka the oldest

      // add position of particle into this.particle_positions
      this.particle_positions.push(position);

      }

    // get random coordinate in between the origin position and the origin position + max_radius
    get_random_coord(cluster_origin, max_radius) {
		let random_val = Math.random() * 2 - 1; // should be value between -1 and 1
        let new_coord = random_val * (cluster_origin + max_radius) + (1 - random_val) * (cluster_origin);
        return new_coord;

    }
    get_3d_position(old_vec) {
      let x_pos = old_vec[0], y_pos = -1 * old_vec[1];
      return Vec.of(x_pos / 30, y_pos / 30, 0);
    }
    // FOR MOUSE CONTROLS
    add_mouse_controls( canvas, program_state )
    {                                       
      this.mouse = { "from_center": Vec.of( 0,0 ) };
      const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) =>
                                   Vec.of( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
                                // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
      document.addEventListener( "mouseup",   e => {  } );
      canvas  .addEventListener( "mousedown", e =>
      {
        let mouse_pos_scale_val = this.children[0].mouse_pos_multiplier;
        let mouse_pos_up_down_val = this.children[0].mouse_pos_up_down;
        let mouse_pos_left_right_val = this.children[0].mouse_pos_left_right;

        this.mouse_pos = this.get_3d_position(mouse_position(e));
        let mouse_pos_translation_vec = Vec.of(mouse_pos_left_right_val, mouse_pos_up_down_val, this.mouse_pos[2]);
        this.mouse_pos = this.mouse_pos.times(mouse_pos_scale_val).plus(mouse_pos_translation_vec);
        this.cluster_origin = this.mouse_pos;
        this.updateGoals();
        this.click_time = program_state.animation_time;
      } );
      canvas  .addEventListener( "mousemove", e => { e.preventDefault(); this.mouse.from_center = mouse_position(e); } );
      canvas  .addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale(0) } );
    }
    // update the goals of all active particles
    //   happens on click
    updateGoals()
    {
      for (let i = 0; i < this.num_particles; i++) {
        this.particle_boxes[Math.floor(i / particles_per_box)][i % particles_per_box].goal = this.mouse_pos;//.randomized(4);
      }
    }

    // functions to shade coloring of water particles based on velocity input:
    // RGB_Linear_Blend taken from https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    RGB_Linear_Blend(p,c0,c1) {
        var i=parseInt,r=Math.round,P=1-p,[a,b,c,d]=c0.split(","),[e,f,g,h]=c1.split(","),x=d||h,d=x?","+(!d?h:!h?d:r((parseFloat(d)*P+parseFloat(h)*p)*1000)/1000+")"):")";
        return"rgb"+(x?"a(":"(")+r(i(a[3]=="a"?a.slice(5):a.slice(4))*P+i(e[3]=="a"?e.slice(5):e.slice(4))*p)+","+r(i(b)*P+i(f)*p)+","+r(i(c)*P+i(g)*p)+d;
    }
    // function to scale values in between a desired range
    scaleBetween(unscaledNum, minAllowed, maxAllowed, min, max) {
	   return (maxAllowed-minAllowed)*(unscaledNum-min)/(max-min)+minAllowed;
	}

  display( context, program_state )
    {                                                
      if( !context.scratchpad.controls )
        {                       // Add a movement controls panel to the page:
          this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );

                                // Add a helper scene / child scene that allows viewing each moving body up close.

          program_state.set_camera( Mat4.look_at( Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
          this.initial_camera_location = program_state.camera_inverse;
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 200 );
        }

      const t = program_state.animation_delta_time / 1000;


      /**********************************
      Start coding down here!!!!
      **********************************/

      let particle_color = null;
      const blue = Color.of( 0,0,.5,1 ), yellow = Color.of( .5,.5,0,1 ), transparent = Color.of( 0.5,0.5,0.9,0.1 );

                                    // Variable model_transform will be a local matrix value that helps us position shapes.
                                    // It starts over as the identity every single frame - coordinate axes at the origin.
      let model_transform = Mat4.identity();
                                                
      program_state.lights = [ new Light( Vec.of( 0,0,0,1 ), Color.of( 1,1,1,1 ), 100000 ) ];

      // update each particle's position and velocity, then draw it
  	  if (!this.is_paused)
      	this.updatePositions();

      for (let b = 0; b < this.particle_boxes.length; b++) {
        let cur_box = this.particle_boxes[b];

        for (let i = 0; i < cur_box.length; i++) {
          let cur_particle = cur_box[i];

          let cur_transform = model_transform.times( Mat4.translation(cur_particle.position) )
                                             .times( Mat4.scale(this.scale_vec) );


        // WATER code
        // -fluid motion
        if (this.element_setting === "Water") {
            // -change coloring & physics: color should become lighter (more teal) as velocity increases
            const percentage = this.scaleBetween(cur_particle.velocity.norm(), 0, 1, 0, 2);
            const scaled_color = this.RGB_Linear_Blend(percentage, "rgb(0, 0, 127)", "rgb(0, 255, 230)");
            const inner_color_input = (scaled_color.slice(4, scaled_color.length-1)).split(",");
            const adj_inner_color = [
                this.scaleBetween(Number(inner_color_input[0]), 0, 1, 0, 255),
                this.scaleBetween(Number(inner_color_input[1]), 0, 1, 0, 255),
                this.scaleBetween(Number(inner_color_input[2]), 0, 1, 0, 255)
            ];
            particle_color = Color.of(adj_inner_color[0], adj_inner_color[1], adj_inner_color[2], 1);

			this.shapes.ball_3.draw( context, program_state, cur_transform, this.materials.plastic.override( particle_color ) );
       }
       else if (this.element_setting === "Fire") {
       		// change particle colors
       		particle_color = Color.of(1,1/((cur_particle.position.minus(this.mouse_pos).norm()/2)+1),0,1);

       		// move particles upwards
       		let frames_fn = (starting_life - cur_particle.life) / 4000;
       		let fire_vel_vec = Vec.of(0, this.fire_acc_vec[1] * frames_fn, 0);
			cur_particle.velocity = cur_particle.velocity.plus(fire_vel_vec)
														 .plus( Vec.of(1,0,0).times((Math.random()-0.5) * 0.1));
			this.shapes.ball_3.draw( context, program_state, cur_transform, this.materials.plastic.override( particle_color ) );
       }
       else if (this.element_setting === "Earth"){
       	let earthCat = i % 2;
       	cur_transform = cur_transform.times( Mat4.scale( cur_particle.earth_size ) );
       	switch (earthCat){
       		//clay
       		case 0:
       		particle_color = this.clay_colors[i%40];
       		this.shapes.box.draw( context, program_state, cur_transform, this.materials.dirt.override( particle_color ) );
       		break;

			//rocks
       		case 1:
       		particle_color = this.rock_colors[i%40];
       		this.shapes.ball_4.draw( context, program_state, cur_transform, this.materials.rock.override( particle_color));

       	}

       }

        }
      }

      // FOR MOUSE CONTROLS
      if( !this.mouse_enabled_canvases.has( context.canvas ) )
      {
        this.add_mouse_controls( context.canvas, program_state );
        this.mouse_enabled_canvases.add( context.canvas )
      }

    }
}

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }



const Movement_Controls = defs.Movement_Controls =
class Movement_Controls extends Scene
{                                       // **Movement_Controls** is a Scene that can be attached to a canvas, like any other
                                        // Scene, but it is a Secondary Scene Component -- meant to stack alongside other
                                        // scenes.  Rather than drawing anything it embeds both first-person and third-
                                        // person style controls into the website.  These can be used to manually move your
                                        // camera or other objects smoothly through your scene using key, mouse, and HTML
                                        // button controls to help you explore what's in it.
  constructor()
    { super();
      const data_members = { roll: 0, look_around_locked: true,
                             thrust: Vec.of( 0,0,0 ), pos: Vec.of( 0,0,0 ), z_axis: Vec.of( 0,0,0 ),
                             radians_per_frame: 1/200, meters_per_frame: 20, speed_multiplier: 1, mouse_pos_multiplier: 1,
                             mouse_pos_up_down: 0, mouse_pos_left_right: 0 };
      Object.assign( this, data_members );

      this.mouse_enabled_canvases = new Set();
      this.will_take_over_graphics_state = true;
    }
  set_recipient( matrix_closure, inverse_closure )
    {                               // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
                                    // instead, track an external target matrix to modify.  Targets must be pointer references
                                    // made using closures.
      this.matrix  =  matrix_closure;
      this.inverse = inverse_closure;
    }
  reset( graphics_state )
    {                         // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
                              // encountered program_state object.  Targets must be pointer references made using closures.
      this.set_recipient( () => graphics_state.camera_transform,
                          () => graphics_state.camera_inverse   );
    }
  add_mouse_controls( canvas )
    {                                       // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
                                            // First, measure mouse steering, for rotating the flyaround camera:
      this.mouse = { "from_center": Vec.of( 0,0 ) };
      const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) =>
                                   Vec.of( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
                                // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
      document.addEventListener( "mouseup",   e => { this.mouse.anchor = undefined; } );
      canvas  .addEventListener( "mousedown", e => {  } );
      canvas  .addEventListener( "mousemove", e => {  } );
      canvas  .addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale(0) } );
    }
  show_explanation( document_element ) { }
  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
      //this.control_panel.innerHTML += "Click and drag the scene to <br> spin your viewpoint around it.<br>";
      this.key_triggered_button( "Up",     [ " " ], () =>
      { this.thrust[1] = -1;
        this.mouse_pos_up_down = this.mouse_pos_up_down + 6; },
       undefined, () => this.thrust[1] = 0 );
      this.key_triggered_button( "Forward",[ "k" ], () =>
        { this.thrust[2] =  1;
          this.mouse_pos_multiplier = this.mouse_pos_multiplier - 0.17; },
          undefined, () => this.thrust[2] = 0 );
      this.new_line();
      this.key_triggered_button( "Left",   [ "l" ], () =>
       {this.thrust[0] =  1;
        this.mouse_pos_left_right = this.mouse_pos_left_right - 6;},
        undefined, () => this.thrust[0] = 0 );
      this.key_triggered_button( "Back",   [ "b" ], () =>
        { this.thrust[2] = -1;
          this.mouse_pos_multiplier = this.mouse_pos_multiplier + 0.17; },
         undefined, () => this.thrust[2] = 0 );
      this.key_triggered_button( "Right",  [ "r" ], () =>
      {this.thrust[0] = -1
        this.mouse_pos_left_right = this.mouse_pos_left_right + 6;},
       undefined, () => this.thrust[0] = 0 );
      this.key_triggered_button( "Down",   [ "d" ],() =>
      {this.thrust[1] =  1;
        this.mouse_pos_up_down = this.mouse_pos_up_down - 6;},
       undefined, () => this.thrust[1] = 0 );
    }
  first_person_flyaround( radians_per_frame, meters_per_frame, leeway = 70 )
    {                                                     // (Internal helper function)
                                                          // Compare mouse's location to all four corners of a dead box:
      const offsets_from_dead_box = { plus: [ this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway ],
                                     minus: [ this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway ] };
                                                          // Apply a camera rotation movement, but only when the mouse is
                                                          // past a minimum distance (leeway) from the canvas's center:
      if( !this.look_around_locked )
                                              // If steering, steer according to "mouse_from_center" vector, but don't
                                              // start increasing until outside a leeway window from the center.
        for( let i = 0; i < 2; i++ )
        {                                     // The &&'s in the next line might zero the vectors out:
          let o = offsets_from_dead_box,
            velocity = ( ( o.minus[i] > 0 && o.minus[i] ) || ( o.plus[i] < 0 && o.plus[i] ) ) * radians_per_frame;
                                              // On X step, rotate around Y axis, and vice versa.
          this.matrix().post_multiply( Mat4.rotation( -velocity, Vec.of( i, 1-i, 0 ) ) );
          this.inverse().pre_multiply( Mat4.rotation( +velocity, Vec.of( i, 1-i, 0 ) ) );
        }
      this.matrix().post_multiply( Mat4.rotation( -.1 * this.roll, Vec.of( 0,0,1 ) ) );
      this.inverse().pre_multiply( Mat4.rotation( +.1 * this.roll, Vec.of( 0,0,1 ) ) );
                                    // Now apply translation movement of the camera, in the newest local coordinate frame.
      this.matrix().post_multiply( Mat4.translation( this.thrust.times( -meters_per_frame ) ) );
      this.inverse().pre_multiply( Mat4.translation( this.thrust.times( +meters_per_frame ) ) );
    }
  third_person_arcball( radians_per_frame )
    {                                           // (Internal helper function)
                                                // Spin the scene around a point on an axis determined by user mouse drag:
      const dragging_vector = this.mouse.from_center.minus( this.mouse.anchor );
      if( dragging_vector.norm() <= 0 )
        return;
      this.matrix().post_multiply( Mat4.translation([ 0,0, -25 ]) );
      this.inverse().pre_multiply( Mat4.translation([ 0,0, +25 ]) );

      const rotation = Mat4.rotation( radians_per_frame * dragging_vector.norm(),
                                                  Vec.of( dragging_vector[1], dragging_vector[0], 0 ) );
      this.matrix().post_multiply( rotation );
      this.inverse().pre_multiply( rotation );

      this. matrix().post_multiply( Mat4.translation([ 0,0, +25 ]) );
      this.inverse().pre_multiply( Mat4.translation([ 0,0, -25 ]) );
    }
  display( context, graphics_state, dt = graphics_state.animation_delta_time / 1000 )
    {                                                            // The whole process of acting upon controls begins here.
      const m = this.speed_multiplier * this. meters_per_frame,
            r = this.speed_multiplier * this.radians_per_frame;

      if( this.will_take_over_graphics_state )
      { this.reset( graphics_state );
        this.will_take_over_graphics_state = false;
      }

      if( !this.mouse_enabled_canvases.has( context.canvas ) )
      { this.add_mouse_controls( context.canvas );
        this.mouse_enabled_canvases.add( context.canvas )
      }
                                     // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
      this.first_person_flyaround( dt * r, dt * m );
                                     // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
      if( this.mouse.anchor )
        this.third_person_arcball( dt * r );
                                     // Log some values:
      this.pos    = this.inverse().times( Vec.of( 0,0,0,1 ) );
      this.z_axis = this.inverse().times( Vec.of( 0,0,1,0 ) );
    }
}

const Rock_Shader = defs.Rock_Shader =
class Rock_Shader extends defs.Phong_Shader
{ 
 vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return this.shared_glsl_code() + `
vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec3 P)
{
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

varying float noise;

float turbulence( vec3 p ) {

  float w = 100.0;
  float t = -.5;

  for (float f = 1.0 ; f <= 10.0 ; f++ ){
    float power = pow( 2.0, f );
    t += abs( pnoise( vec3( power * p ), vec3( 10.0, 10.0, 10.0 ) ) / power );
  }

  return t;

}
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.
        
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        varying float disp;


        void main()
          {                                                                   
          noise = -.10 * turbulence( .5 * normal );
  		// get a 3d noise using the position, low frequency
  		float b = 5.0 * pnoise( 0.05 * position, vec3( 100.0 ) );
  		// compose both noises
  		disp = - 10. * noise + b;
		vec3 newPosition = position + normal * disp;
  		gl_Position = projection_camera_model_transform * vec4( newPosition, 1.0 );
  		 N = normalize( mat3( model_transform ) * normal / squared_scale);
		vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
          } ` ;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER ********* 
    {                          // A fragment is a pixel that's overlapped by the current triangle.
                               // Fragments affect the final image or get discarded due to depth.                                
      return this.shared_glsl_code() + `

        void main()
          {
          	gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                                                                     // Compute the final color with contributions from lights:
            gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                                                         
          } ` ;
    }
}