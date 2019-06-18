# Elemental Particle Simulator

CS 174A - Spring 2019
Steven La, Yechan Lee, Christopher Ngai, Kyle Reidy
Project can be viewed in Chrome at: https://kreidy.github.io/CS118-term-project-5/

# Description
A physics-based hydrodynamic particle simulator, featuring elements of air, water, earth, and fire.

# Stuff that Isn't Obvious

- Getting all of the particles on screen to move to user's cursor
  - Needed a dynamic mapping function to scale a point chosen on screen to a 3D point within the camera display
  - `mouse_position()` function returns a XY coordinate between -540 to 540 for X and -380 to 380 for Y
  - Dynamic mapping function converted 2D point on display screen to 3D point in XYZ plane of our scene
  - Moving camera forward/back, left/right, up/down changes the 3D coordinate system but the 2D XY coordinate system remains the same. Thus we needed a mapping function that handled camera transformations

- Making the particles interact in a realistic, physics-based fashion
  - Needed extensive research and implementation of Lennard-Jones Potential/Forces (for attraction/repulsion of nearby particles)
  - Needed to implement acceleration due to gravity in water scene (spout demo)
  - Needed to research and implement elastic force collisions, especially for interaction between water particles and box boundaries

- Getting velocity of particles to be reflected in color
  - Needed to research and implement linear scaling of RGB values, used extensively in water demo

- Mimicking real particle behavior
  - Needed to research and implement regeneration of particles based on a timer
  - Needed to research and implement physical clustering of partcles around a chosen center
  - Needed to fine tune Lennard-Jones Potential to reduce clipping (when particles are spawned too close to one another, the physical attraction is so great
    that they accelerate towards each other. But, because they are closer, they also repel, which causes the particles to increase in overall velocity, whilst
    bouncing in and out of equilibrium. This causes a glitchy look.) by lowering scalar values.
  - Improving particle regeneration algorithms to achieve a more realistic particle lifetime

# Advanced Topics

- Movement Interpolation (Tweening)
  - Particles movement to their respective goals is done in a smooth fashion
- Particle Physics
  - See "Mimicking real particle behavior" in above section
- Mouse Picking
  - See "Getting all of the particles on screen to move to user's cursor" in above section

# Team and Roles

- Steven La
  - Water coloring based on velocity
  - Particle Regeneration Mapping
  - Lennard-Jones fine-tuning (fixed particle collision bug)
  - Water hydrodynamics implementation

- Yechan Lee
  - Earth particle shapes and texturing
  - Clay and rock coloring function
  - Fire coloring based on particle distance from cluster origin
  - Rock shader implementation

- Kyle Reidy
  - Lennard-Jones Potential implementation
  - Spout Demo creation
  - Elastic collision implementation for spout demo
  - Improved particle regeneration
  - Particle class
  - Improved particle velocity and acceleration features
  - Implemented particle boxes for realistic particle collisions
  - Pause and Next Frame feature
  - Velocity normalization

- Christopher Ngai
  - Particle regeneration implementation
  - Particle parameter adjustment functions (size, # of particles, reaction speed)
  - Fire particle acceleration
  - Random scaling for Earth particles
  - Mouse movement controls and dynamic mapping function
  - Reset function
  - Spout demo bug fixes
