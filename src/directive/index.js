import Vue from 'vue';
import Permission from './permission';
import Clipboard from './clipboard';
import InputNumber from './number';
import Clickoutside from './clickoutside';

[Permission, Clipboard, InputNumber, Clickoutside].forEach((d) => Vue.use(d));
