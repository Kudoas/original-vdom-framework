/** image */
/**
input h(): h("h1", {class: "title"}, "仮想DOM実践入門")
output vdom: 
  {
    nodeName: "h1",
    attributes: { class: "title", "onclick": funcition() },
    children: "仮想DOM実践入門"
  }
*/

type NodeType = VNode | string | number;
type Attributes = { [key: string]: string | Function };

export interface View<State, Action> {
  (state: State, action: Action): VNode;
}

/** vdom */
export interface VNode {
  nodeName: keyof HTMLElementTagNameMap;
  attributes: Attributes;
  children: NodeType[];
}

/** vdomを作成する関数 */
export const h = (
  nodeName: keyof HTMLElementTagNameMap,
  attributes: Attributes,
  ...children: NodeType[]
): VNode => {
  return { nodeName, attributes, children };
};

/** リアルDOMを生成する */
export const createElement = (node: NodeType): HTMLElement | Text => {
  if (!isVNode(node)) {
    return document.createTextNode(node.toString());
  }
  const el = document.createElement(node.nodeName);
  setAttributes(el, node.attributes);
  node.children.forEach((child) => el.appendChild(createElement(child)));
};

const isVNode = (node: NodeType): node is VNode => {
  return typeof node !== "string" && typeof node !== "number";
};

/** targetに属性を設定する */
/** attr: {"class": "hoge", "onclick": function} */
const setAttributes = (target: HTMLElement, attrs: Attributes) => {
  for (let attr in attrs) {
    if (isEventAttr(attr)) {
      const eventName = attr.slice(2);
      target.addEventListener(eventName, attrs[attr] as EventListener);
    } else {
      target.setAttribute(attr, attrs[attr] as string);
    }
  }
};

/** onがついてたらイベント */
const isEventAttr = (attr: string): boolean => {
  return /^on/.test(attr);
};

/**　差分検知 */
enum ChangedType {
  /** no diff */
  None,

  /** nodeの型が違う */
  Type,

  /** テキストノードが違う */
  Text,

  /** ノード名(タグ名)が違う */
  Node,

  /** inputのvalueが違う */
  Value,

  /** 属性が違う */
  Attr,
}

const hasChanged = (a: NodeType, b: NodeType): ChangedType => {
  // different type
  if (typeof a != typeof b) {
    return ChangedType.Type;
  }

  // different string
  if (!isVNode(a) && a !== b) {
    return ChangedType.Text;
  }

  if (isVNode(a) && isVNode(b)) {
    if (a.nodeName != b.nodeName) {
      return ChangedType.Node;
    }
    if (a.attributes.value !== b.attributes.value) {
      return ChangedType.Value;
    }
    if (JSON.stringify(a.attributes) !== JSON.stringify(b.attributes)) {
      return ChangedType.Attr;
    }
  }
  return ChangedType.None;
};

/**
 * 仮想DOMの差分を検知し、リアルDOMに反映する
 */
export const updateElement = (
  parent: HTMLElement,
  oldNode: NodeType,
  newNode: NodeType,
  index = 0
) => {
  if (!oldNode) {
    parent.appendChild(createElement(newNode));
    return;
  }

  const target = parent.childNodes[index];

  if (!newNode) {
    parent.removeChild(target);
    return;
  }

  const changedType = hasChanged(oldNode, newNode);
  switch (changedType) {
    case ChangedType.Type:
    case ChangedType.Text:
    case ChangedType.Node:
      parent.replaceChild(createElement(newNode), target);
      return;
    case ChangedType.Value:
      updateValue(target as HTMLInputElement, (newNode as VNode).attributes.value as string);
      return;
    case ChangedType.Attr:
      updateAttributes(
        target as HTMLElement,
        (oldNode as VNode).attributes,
        (newNode as VNode).attributes
      );
      return;
  }

  if (isVNode(oldNode) && isVNode(newNode)) {
    for (let i = 0; i < newNode.children.length || i < oldNode.children.length; i++) {
      updateElement(target as HTMLElement, oldNode.children[i], newNode.children[i]);
    }
  }
};

const updateAttributes = (target: HTMLElement, oldAttrs: Attributes, newAttrs: Attributes) => {
  for (let attr in oldAttrs) {
    if (!isEventAttr(attr)) {
      target.removeAttribute(attr);
    }
  }

  for (let attr in newAttrs) {
    if (!isEventAttr(attr)) {
      target.setAttribute(attr, newAttrs[attr] as string);
    }
  }
};

const updateValue = (target: HTMLInputElement, newValue: string) => {
  target.value = newValue;
};
