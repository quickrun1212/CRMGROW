import * as Quill from 'quill';
const Embed = Quill.import('blots/embed');
const Delta = Quill.import('delta');
const Parchment = Quill.import('parchment');

export const numPad = (num) => {
  if (num < 10) {
    return '0' + num;
  }
  return num + '';
};


export const TelFormat = {
  numericOnly: true,
  blocks: [0, 3, 3, 4],
  delimiters: ['(', ') ', '-']
};

export const ByteToSize = (bytes, decimals = 2) => {
  if (bytes === 0) { return '0 Bytes'; }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const AppendArray = (arr1, arr2) => {
  if (!(arr1 && arr1.length)) {
    return arr2;
  } else if (!(arr2 && arr2.length)) {
    return arr1;
  } else {
    return arr1.concat(arr2);
  }
};

export const PullArray = (arr1, arr2) => {
  if (!arr1 || !arr1.length) {
    return [];
  } else if (!arr2 || !arr2.length) {
    return arr1;
  } else {
    const diff = [];
    arr1.forEach((e) => {
      if (arr2.indexOf(e) === -1) {
        diff.push(e);
      }
    });
    return diff;
  }
};

export const promptForFiles = (): Promise<FileList> => {
  return new Promise<FileList>((resolve, reject) => {
    // make file input element in memory
    const fileInput: HTMLInputElement = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    // fileInput['capture'] = 'camera';
    fileInput.addEventListener('error', (event) => {
      reject(event.error);
    });
    fileInput.addEventListener('change', (event) => {
      resolve(fileInput.files);
    });
    // prompt for video file
    fileInput.click();
  });
};

export const listToTree = (list) => {
  var map = {}, node, roots = [], i;
  for (i = 0; i < list.length; i += 1) {
    map[list[i].ref] = i; // initialize the map
    list[i].children = []; // initialize the children
  }
  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    if (node.parent_ref !== '0') {
      if (
        list[map[node.parent_ref]] &&
        list[map[node.parent_ref]].status === 'disabled'
      ) {
        node.status = 'disabled';
      }
      list[map[node.parent_ref]].children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
};

export const rebuildListToTree = (list) => {
  const map = {};
  const roots = [];
  let root = null;
  for (const node of list) {
    map[node.ref] = node;
    node.children = [];
  }

  for (const node of list) {
    if (node.parent_ref !== '0') {
      const parent = map[node.parent_ref];
      if (parent) {
        if (parent.status === 'disabled') { node.status = 'disabled'; }
        parent.children.push(node);
      }
    } else {
      root = node;
    }
  }

  if (root === null) { return roots; }

  for (const node of list) {
    const parent = map[node.parent_ref];
    const isCompleted = !isUncompleted(node);
    if (parent && isCompleted) {
      const index = parent.children.indexOf(node.ref);
      if (index >= 0) { parent.children.splice(index, 1); }
    }
  }

  while (true) {
    // if (root.children.length == 1) {
    //   const child = root.children[0];
    //   if (root.status === 'completed' && child.status === 'completed')
    //     root = child;
    //   else
    //     break;
    // }
    // else
    //   break;
    if (root.status === 'completed') {
      let nextChild = null;
      for (const child of root.children) {
        if (child.status === 'completed') {
          nextChild = child;
        }
      }
      if (nextChild) { root = nextChild; }
      else { break; }
    } else { break; }
  }

  if (isUncompleted(root)) { roots.push(root); }

  return roots;
};

function isUncompleted(node): any {
  if (node.status === 'active' || node.status === 'pending') {
    return true;
  }

  for (const child of node.children) {
    if (isUncompleted(child) === true) {
      return true;
    }
  }
  return false;
}
export const loadBase64 = (file: Blob): Promise<any> => {
  const fileReader = new FileReader();
  return new Promise<any>((resolve, reject) => {
    fileReader.addEventListener('error', reject);
    fileReader.addEventListener('load', () => {
      resolve(fileReader.result);
    });
    fileReader.readAsDataURL(file);
  });
};

export class SignatureBlot extends Embed {
  static blotName = 'emailSignature';
  static tagName = 'div';
  static className = 'email-signature';
  static create(data) {
    const node = super.create(data.value);
    node.setAttribute('data-value', data.value);
    node.innerHTML = data.value;
    return node;
  }

  static value(domNode) {
    return domNode.getAttribute('data-value');
  }
}

const Block = Parchment.query('block');
Block.tagName = 'DIV';

Quill.register(SignatureBlot, true);
Quill.register(Block, true);

export function toInteger(value: any): number {
  return parseInt(`${value}`, 10);
}

export function toString(value: any): string {
  return value !== undefined && value !== null ? `${value}` : '';
}

export function getValueInRange(value: number, max: number, min = 0): number {
  return Math.max(Math.min(value, max), min);
}

export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return !isNaN(toInteger(value));
}

export function isInteger(value: any): value is number {
  return (
    typeof value === 'number' && isFinite(value) && Math.floor(value) === value
  );
}

export function isDefined(value: any): boolean {
  return value !== undefined && value !== null;
}

export function padNumber(value: number): any {
  if (isNumber(value)) {
    return `0${value}`.slice(-2);
  } else {
    return '';
  }
}

export function regExpEscape(text): any {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function hasClassName(element: any, className: string): boolean {
  return (
    element &&
    element.className &&
    element.className.split &&
    element.className.split(/\s+/).indexOf(className) >= 0
  );
}

if (typeof Element !== 'undefined' && !Element.prototype.closest) {
  // Polyfill for ie10+

  if (!Element.prototype.matches) {
    // IE uses the non-standard name: msMatchesSelector
    Element.prototype.matches =
      (Element.prototype as any).msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;
  }

  Element.prototype.closest = function(s: string) {
    let el = this;
    if (!document.documentElement.contains(el)) {
      return null;
    }
    do {
      if (el.matches(s)) {
        return el;
      }
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

export function closest(element: HTMLElement, selector): HTMLElement {
  if (!selector) {
    return null;
  }

  return element.closest(selector);
}

export function adjustPhoneNumber(str): any {
  const result = str.replace(/[^0-9]/g, '');
  if (str[0] === '+') {
    return `+${result}`;
  } else {
    return result;
  }
}

export function validateEmail(email): any {
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}/gim;
  if (email === '' || !re.test(email)) {
    return false;
  }
  return true;
}
