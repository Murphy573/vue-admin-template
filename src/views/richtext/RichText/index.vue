<template>
  <div
    class="richtext-container"
    v-clickoutside:WeiboRichtext="handleClickoutside">
    <RichtextEditorCore
      ref="richtextEditorCore"
      :identifierOptions="identifierOptions"
      :placeholder="placeholder"
      :maxlength="maxlength"
      @on-sync-caret-pos="handleSyncCaretPos"
      @on-trigger="handleTrigger"
      @on-cancel-trigger="handleCancelTrigger" />
    <el-button @click="handleClickAtBtn"
      >@{{ atMembersOptions.visible }}</el-button
    >
    <AtMembers
      :visible.sync="atMembersOptions.visible"
      :pos="caretPos"
      @on-cancel-select="handleCancelMemberSelect"
      @on-select="handleMemberSelect" />
  </div>
</template>

<script>
import AtMembers from './AtMembers.vue';
import RichtextEditorCore from './RichtextEditorCore.vue';
/**
 * TODO:
 * 1、
 */
export default {
  name: 'Richtext',

  components: { AtMembers, RichtextEditorCore },

  props: {
    placeholder: {
      type: String,
      default: '输入文案...',
    },
    maxlength: {
      type: Number,
      default: Infinity,
    },
  },

  data() {
    return {
      richtextEditorCore: null,
      // @ @人员
      atMembersOptions: {
        visible: false,
      },
      caretPos: { x: 0, y: 0 },
      // # 超话
      superTopicsOptions: {
        visible: false,
      },
      identifierOptions: [
        {
          key: '@',
          datasetKey: 'memberInfo',
        },
      ],
    };
  },

  mounted() {
    this.$nextTick(() => {
      this.richtextEditorCore = this.$refs.richtextEditorCore || null;

      if (!this.richtextEditorCore) return;
    });
  },

  methods: {
    // 选择@人员
    handleMemberSelect(member, trigger) {
      this.richtextEditorCore.handleConfirmTrigger({
        data: member,
        trigger,
        contentKey: 'name',
        identifier: '@',
      });
    },
    // 取消选择@人员
    handleCancelMemberSelect() {
      this.atMembersOptions.visible = false;
      this.richtextEditorCore.handleCancelTrigger('@', true);
    },
    handleTrigger(identifier) {
      if (identifier === '@') {
        this.atMembersOptions.visible = true;
      }
    },
    handleClickAtBtn() {
      this.richtextEditorCore.handleTrigger('@');
    },
    handleCancelTrigger(identifier) {
      if (identifier === '@') {
        this.atMembersOptions.visible = false;
      }
    },
    // 点击容器外
    handleClickoutside() {
      this.richtextEditorCore.handleClickoutside();
    },
    handleSyncCaretPos(pos) {
      this.caretPos = pos;
    },
  },
};
</script>

<style lang="scss" scoped>
.richtext-container {
  position: relative;
  width: max-content;
  height: max-content;
  user-select: none;
}
</style>
