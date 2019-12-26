<script>
import MyStorage from '@/utils/storage';

export default {
  created () {
    const _redirectRouter = JSON.parse(MyStorage.sessionStorage.getItem('REDIRECT_ROUTER'));
    if (!_redirectRouter) return;
    MyStorage.sessionStorage.removeItem('REDIRECT_ROUTER');
    this.$router.replace(_redirectRouter);
  },
  render: function (h) {
    return h(); // avoid warning message
  }
};
</script>
