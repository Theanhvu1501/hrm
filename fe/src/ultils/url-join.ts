import urljoin from "url-join";

export const urlJoin = (...urls: (string | undefined)[]) => {
  const joined = urljoin(...urls.map((url) => url || "/"));
  if (joined && joined !== "/") {
    return joined.replace(/\/+$/g, "");
  }
  return "/";
};

export const replaceUrlStart = (
  input: string,
  find: string,
  replaceBy: string
) => {
  if (!input.startsWith(find)) return input;
  if (input === find) return replaceBy;
  return `${replaceBy}${input.substring(
    find === "/" ? find.length : find.length + 1
  )}`;
};

export const getFileExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1
    ? ""
    : fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
};
