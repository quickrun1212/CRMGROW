import { DOCUMENT } from '@angular/common';
import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { FileService } from 'src/app/services/file.service';
import * as QuillNamespace from 'quill';
import { promptForFiles, loadBase64, ByteToSize } from 'src/app/helper';

const Quill: any = QuillNamespace;
// import ImageResize from 'quill-image-resize-module';
// Quill.register('modules/imageResize', ImageResize);

@Component({
  selector: 'app-html-editor',
  templateUrl: './html-editor.component.html',
  styleUrls: ['./html-editor.component.scss']
})
export class HtmlEditorComponent implements OnInit {
  @Input() placeholder: string = '';
  @Input() style: any = { height: '180px' };
  @Input() class = '';
  @Input() hasToken: boolean = false;
  @Input() required: boolean = false;
  @Input() hasAttachment: boolean = false;

  @Input() value: string = '';
  @Output() valueChange: EventEmitter<string> = new EventEmitter();
  @Output() onFocus: EventEmitter<boolean> = new EventEmitter();
  @Output() attachmentChange: EventEmitter<any> = new EventEmitter();

  editorForm: FormControl = new FormControl();
  @ViewChild('emailEditor') emailEditor: QuillEditorComponent;
  quillEditorRef;
  attachments = [];
  config = {
    toolbar: {
      container: [
        [{ font: [] }],
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ header: 1 }, { header: 2 }],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['link', 'image'],
        this.hasAttachment ? ['attachment'] : []
      ],
      handlers: {
        attachment: () => {
          promptForFiles().then((files) => {
            [].forEach.call(files, (file) => {
              loadBase64(file).then((base64) => {
                const attachment = {
                  filename: file.name,
                  type: file.type,
                  content: base64.substr(base64.indexOf(',') + 1),
                  size: ByteToSize(file.size)
                };
                this.attachments.splice(this.attachments.length, 1, attachment);
                this.attachmentChange.emit(this.attachments);
                this.emailEditor.quillEditor.focus();
              });
            });
          });
        }
      }
    },
    table: false,
    'better-table': {
      operationMenu: {
        items: {
          unmergeCells: {
            text: 'Another unmerge cells name'
          }
        },
        color: {
          colors: ['green', 'red', 'yellow', 'blue', 'white'],
          text: 'Background Colors:'
        }
      }
    },
    blotFormatter: {}
  };

  constructor(
    private fileService: FileService,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {}

  setValue(value: string): void {
    if (value && this.quillEditorRef && this.quillEditorRef.clipboard) {
      const delta = this.quillEditorRef.clipboard.convert({ html: value });
      this.emailEditor.quillEditor.setContents(delta, 'user');
    }
  }

  getEditorInstance(editorInstance: any): void {
    this.quillEditorRef = editorInstance;
    const toolbar = this.quillEditorRef.getModule('toolbar');
    toolbar.addHandler('image', this.initImageHandler);
  }

  initImageHandler = (): void => {
    const imageInput: HTMLInputElement = this.document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/*';

    imageInput.addEventListener('change', () => {
      if (imageInput.files != null && imageInput.files[0] != null) {
        const file = imageInput.files[0];
        this.fileService.attachImage(file).then((res) => {
          this.insertImageToEditor(res['url']);
        });
      }
    });
    imageInput.click();
  };

  insertImageToEditor(url: string): void {
    const range = this.quillEditorRef.getSelection();
    this.emailEditor.quillEditor.insertEmbed(range.index, `image`, url, 'user');
    this.emailEditor.quillEditor.setSelection(range.index + 1, 0, 'user');
  }

  insertEmailContentValue(value: string): void {
    this.emailEditor.quillEditor.focus();
    const range = this.emailEditor.quillEditor.getSelection();
    this.emailEditor.quillEditor.insertText(range.index, value, 'api');
    this.emailEditor.quillEditor.setSelection(
      range.index + value.length,
      0,
      'api'
    );
  }

  onChangeValue(value: string): void {
    this.valueChange.emit(value);
  }

  insertMaterials(material: any): void {
    const range = this.quillEditorRef.getSelection();
    const length = this.emailEditor.quillEditor.getLength();
    if (range && range.index) {
      let selection = range.index;
      this.emailEditor.quillEditor.insertText(selection, '\n', {}, 'user');
      selection += 1;
      this.emailEditor.quillEditor.insertText(
        selection,
        material.title,
        'bold',
        'user'
      );
      selection += material.title.length + 1;
      this.emailEditor.quillEditor.insertEmbed(
        selection,
        `materialLink`,
        { _id: material._id, preview: material.preview || material.thumbnail },
        'user'
      );
      selection += 1;
      this.emailEditor.quillEditor.setSelection(selection, 0, 'user');
    } else {
      let selection = length;
      this.emailEditor.quillEditor.insertText(selection, '\n', {}, 'user');
      selection += 1;
      this.emailEditor.quillEditor.insertText(
        length,
        material.title,
        'bold',
        'user'
      );
      selection += material.title.length + 1;
      this.emailEditor.quillEditor.insertEmbed(
        selection,
        `materialLink`,
        { _id: material._id, preview: material.preview || material.thumbnail },
        'user'
      );
      selection += 1;
      this.emailEditor.quillEditor.setSelection(selection, 0, 'user');
    }
  }
  removeAttachment(index): void {
    this.attachments.splice(index, 1);
    this.attachmentChange.emit(this.attachments);
  }

  clearAttachments(): void {
    this.attachments = [];
  }

  onFocusEvt(): void {
    this.onFocus.emit();
  }
}
