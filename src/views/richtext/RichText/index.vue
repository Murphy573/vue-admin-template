<template>
  <div v-clickoutside:RichtextCore class="richtext-container">
    <RichtextEditorCore
      ref="richtextEditorCore"
      :identifierOptions="identifierOptions"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :wrapperStyle="wrapperStyle"
      :editorStyle="editorStyle"
      :isCaretPosByContainer="true"
      @on-identifier-search="handleSearch"
      @on-sync-caret-pos="handleSyncCaretPos"
      @on-open-identifier-select="handleTrigger"
      @on-cancel-identifier-select="handleCancelTrigger" />

    <el-row>
      <el-button @click="handleClickAtBtn"
        >@{{ atMembersOptions.visible }}</el-button
      >
      <el-button @click="handleClickSuperTopicBtn"
        >#{{ superTopicsOptions.visible }}</el-button
      >
    </el-row>

    <AtMembers
      :visible.sync="atMembersOptions.visible"
      :pos="caretPos"
      :searchKeyword="richtextSearchkeyword"
      @on-cancel-select="handleCancelMemberSelect"
      @on-select="handleMemberSelect" />
    <SuperTopics
      :visible.sync="superTopicsOptions.visible"
      :pos="caretPos"
      :searchKeyword="richtextSearchkeyword"
      @on-cancel-select="handleCancelSuperTopicSelect"
      @on-select="handleSuperTopicSelect" />

    richtextSearchkeyword:{{ richtextSearchkeyword }}
  </div>
</template>

<script>
import AtMembers from './AtMembers.vue';
import RichtextEditorCore from './RichtextEditorCore.vue';
import SuperTopics from './SuperTopics.vue';
/**
 * TODO:
 * 1、
 */
export default {
  name: 'Richtext',

  components: { AtMembers, SuperTopics, RichtextEditorCore },

  props: {
    placeholder: {
      type: String,
      default: '输入文案...',
    },
    maxlength: {
      type: Number,
      default: 1000,
    },
  },

  data() {
    return {
      richtextEditorCore: null,
      richtextSearchkeyword: '',
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
          identifier: '@',
          preserveIdentifierOnCancel: false,
          datasetKey: 'memberInfo',
          insertPosition: 'start',
          contentLength: 2,
          highlightTagOption: {
            tag: 'span',
            attribute: {
              d1: '1',
            },
          },
        },
        {
          identifier: '#',
          datasetKey: 'topicInfo',
          insertPosition: 'surround',
          preserveIdentifierOnCancel: false,
        },
      ],
      wrapperStyle: {
        className: 'wrapper-style',
        style: {},
      },
      editorStyle: {
        className: 'editor-style',
        style: {},
      },
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
      this.richtextEditorCore.confirmIdentifierSelect({
        data: member,
        trigger,
        contentKey: 'name',
        identifier: '@',
      });
    },
    // 取消选择@人员
    handleCancelMemberSelect() {
      this.atMembersOptions.visible = false;
      this.richtextEditorCore.cancelIdentifierSelect('@', true);
    },
    // 选择#
    handleSuperTopicSelect(topic, trigger) {
      this.richtextEditorCore.confirmIdentifierSelect({
        data: topic,
        trigger,
        contentKey: 'name',
        identifier: '#',
        identifierAlsoEnd: true,
      });
    },
    // 取消选择#
    handleCancelSuperTopicSelect() {
      this.superTopicsOptions.visible = false;
      this.richtextEditorCore.cancelIdentifierSelect('#', true);
    },
    handleTrigger(identifier) {
      if (identifier === '@') {
        this.atMembersOptions.visible = true;
      } else if (identifier === '#') {
        this.superTopicsOptions.visible = true;
      }
    },
    handleSearch(keyword) {
      this.richtextSearchkeyword = keyword;
    },
    handleClickAtBtn() {
      this.richtextEditorCore.openIdentifierSelect('@');
    },
    handleClickSuperTopicBtn() {
      this.richtextEditorCore.openIdentifierSelect('#');
    },
    handleCancelTrigger(identifier) {
      if (identifier === '@') {
        this.atMembersOptions.visible = false;
      } else if (identifier === '#') {
        this.superTopicsOptions.visible = false;
      }
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

.member-class {
  color: red;
}

// .wrapper-style {
//   color: rgb(226, 102, 14);
// }
// .editor-style {
//   background: rgb(145, 27, 184);
// }
</style>
