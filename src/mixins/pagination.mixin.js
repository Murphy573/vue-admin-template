/**
 * 分页混入
 */
import Pagination from '@/components/pagination';

const PAGEPARAMS = {
  page: 1,
  limit: 15,
  total: 0
};

export default {
  components: {
    Pagination
  },
  data () {
    return {
      pageParamsMixin: Object.assign({}, PAGEPARAMS)
    };
  },
  methods: {
    setPageparamsInit () {
      this.pageParamsMixin = Object.assign({}, PAGEPARAMS);
    },
    setFirstPageMixin () {
      this.pageParamsMixin.page = 1;
    },
    setTotalCountMixin (total) {
      this.pageParamsMixin.total = total;
    },
    buildPageParamsMixin () {
      return {
        page: this.pageParamsMixin.page,
        limit: this.pageParamsMixin.limit
      };
    }
  }
};
