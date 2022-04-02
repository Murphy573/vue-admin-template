export default {
  data() {
    return {
      mouseStartXMixin: 0,
      mouseStartYMixin: 0,
      deltaXMixin: 0,
      deltaYMixin: 0,
      offsetXMixin: 0,
      offsetYMixin: 0,
    };
  },

  methods: {
    mousedownHandlerMixin(event) {
      this.resetMouseActionStatusMixin();
      this.mouseStartXMixin = event.clientX;
      this.mouseStartYMixin = event.clientY;
    },

    mousemoveHandlerMixin(event) {
      this.deltaXMixin = event.clientX - this.mouseStartXMixin;
      this.deltaYMixin = event.clientY - this.mouseStartYMixin;
      this.offsetXMixin = Math.abs(this.deltaXMixin);
      this.offsetYMixin = Math.abs(this.deltaYMixin);
    },

    mouseupHandlerMixin(event) {},

    resetMouseActionStatusMixin() {
      this.mouseStartXMixin = 0;
      this.mouseStartYMixin = 0;
      this.deltaXMixin = 0;
      this.deltaYMixin = 0;
      this.offsetXMixin = 0;
      this.offsetYMixin = 0;
    },
  },
};
