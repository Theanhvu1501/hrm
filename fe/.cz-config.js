export const types = [
  { value: "feat", name: "feat:     A new feature" },
  { value: "fix", name: "fix:      A bug fix" },
  { value: "docs", name: "docs:     Documentation only changes" },
  {
    value: "style",
    name: "style:    Changes that do not affect the meaning of the code\n            (white-space, formatting, missing semi-colons, etc)",
  },
  {
    value: "refactor",
    name: "refactor: A code change that neither fixes a bug nor adds a feature",
  },
  {
    value: "perf",
    name: "perf:     A code change that improves performance",
  },
  { value: "test", name: "test:     Adding missing tests" },
  {
    value: "chore",
    name: "chore:    Changes to the build process or auxiliary tools\n            and libraries such as documentation generation",
  },
  { value: "revert", name: "revert:   Revert to a commit" },
  { value: "WIP", name: "WIP:      Work in progress" },
];
export const scopes = [];
export const allowTicketNumber = false;
export const isTicketNumberRequired = false;
export const ticketNumberPrefix = "TICKET-";
export const ticketNumberSuffix = "";
export const ticketNumberRegExp = "\\d{1,5}";
export const messages = {
  type: "Select the type of change that you're committing:",
  scope: "\nDenote the SCOPE of this change (optional):",
  // used if allowCustomScopes is true
  customScope: "Denote the SCOPE of this change:",
  subject: "Write a SHORT, IMPERATIVE tense description of the change:\n",
  body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
  breaking: "List any BREAKING CHANGES (optional):\n",
  footer: "List any ISSUES CLOSED by this change (optional). E.g.: #31, #34:\n",
  confirmCommit: "Are you sure you want to proceed with the commit above?",
};
export const allowCustomScopes = true;
export const allowBreakingChanges = ["feat", "fix"];
export const skipQuestions = ["body"];
export const subjectLimit = 100;
export async function overrideCommit(commit) {
  // Note: This function may not work in all environments as child_process is Node.js specific
  // and may not be available in browser-based commit tools
  try {
    const { execSync } = await import("child_process");
    const branch = execSync("git rev-parse --abbrev-ref HEAD")
      .toString()
      .trim();
    const branchSplit = branch.split("/");
    const prefix = branchSplit[branchSplit.length - 1];
    return `[${prefix}] ${commit}`;
  } catch (error) {
    // console.warn("Could not get branch name:", error);
    return commit;
  }
}
