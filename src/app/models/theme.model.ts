import { Deserializable } from './deserialize.model';

export class Theme implements Deserializable {
  user: string;
  title: string;
  role: string;
  thumbnail: string;
  template_id: string;
  html_content: string;
  json_content: string;
  company: string;
  created_at: Date;
  updated_at: Date;

  deserialize(input: any): this {
    return Object.assign(this, input);
  }
}
