import Vue from 'vue';
import Permission from './permission';
import Clipboard from './clipboard';

[Permission, Clipboard].forEach(d => Vue.use(d));
