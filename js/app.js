// js/app.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats             from 'three/addons/libs/stats.module.js';

import { initSolarSystem } from './main.js';

// 🚀 启动
initSolarSystem(THREE, OrbitControls, Stats);
