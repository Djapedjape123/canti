// Firefox restores a <button>'s disabled state after a reload, before React hydrates,
// so the page no longer matches what the server rendered. autocomplete="off" on the
// button turns that off. React renders the attribute, but its types only allow it on
// form fields, so it is added to <button> here.
import "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- T must match React's declaration to merge
  interface ButtonHTMLAttributes<T> {
    autoComplete?: "off" | undefined;
  }
}
