// Vue SFC 类型声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// composables 类型声明
declare module '@/composables/*' {
  export const wsConnected: import('vue').Ref<boolean>;
  export const wsLastEvent: import('vue').Ref<any>;
  export function onEvent(type: string, fn: (msg: any) => void): () => void;
}
