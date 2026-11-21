declare module 'virtual:content' {
  export const isDev: boolean;
  export const principles: import('./lib/contentSchema').CompiledPrinciple[];
  export const bugStories: import('./lib/contentSchema').CompiledBugStory[];
  export const shelfBooks: import('./lib/contentSchema').CompiledShelfBook[];
  export const shelfTools: import('./lib/contentSchema').CompiledShelfTool[];
  export const commits: import('./lib/contentSchema').CompiledCommit[];
  const content: import('./lib/contentSchema').SiteContentBundle;
  export default content;
}

declare module 'virtual:content/principles' {
  export const isDev: boolean;
  export const principles: import('./lib/contentSchema').CompiledPrinciple[];
}

declare module 'virtual:content/bug-stories' {
  export const bugStories: import('./lib/contentSchema').CompiledBugStory[];
}

declare module 'virtual:content/shelf-items' {
  export const shelfBooks: import('./lib/contentSchema').CompiledShelfBook[];
  export const shelfTools: import('./lib/contentSchema').CompiledShelfTool[];
}

declare module 'virtual:content/commits' {
  export const commits: import('./lib/contentSchema').CompiledCommit[];
}
