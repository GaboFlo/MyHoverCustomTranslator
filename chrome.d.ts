declare namespace chrome {
  namespace storage {
    namespace sync {
      function get(keys: string[]): Promise<{ [key: string]: unknown }>;
      function set(items: { [key: string]: unknown }): Promise<void>;
      function clear(): Promise<void>;
    }
  }

  namespace runtime {
    function openOptionsPage(): void;
  }
}
