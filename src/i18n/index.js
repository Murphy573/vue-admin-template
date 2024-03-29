import Vue from 'vue';
import VueI18n from 'vue-i18n';
import elementEnLocale from 'element-ui/lib/locale/lang/en'; // element-ui 英文
import elementZhLocale from 'element-ui/lib/locale/lang/zh-CN'; // element-ui 中文
import enLocale from './en';
import zhLocale from './zh';

Vue.use(VueI18n);

const messages = {
  en: {
    ...enLocale,
    ...elementEnLocale,
  },
  zh: {
    ...zhLocale,
    ...elementZhLocale,
  },
};

const i18n = new VueI18n({
  locale: 'zh',
  messages,
});

export default i18n;
