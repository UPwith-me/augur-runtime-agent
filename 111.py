class Node:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = {} # map key to node
        # Dummy head and tail
        self.head = Node(0, 0)
        self.tail = Node(0, 0)
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node):
        """Remove node from linked list."""
        prev = node.prev
        nxt = node.next
        prev.next = nxt
        nxt.prev = prev

    def _add(self, node):
        """Add node to head (after dummy head)."""
        
        p = self.head.next 
        
        node.prev = self.head
        node.next = p
        
        self.head.next = node

    def get(self, key):
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add(node)
            return node.value
        return -1

    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])
        
        node = Node(key, value)
        self._add(node)
        self.cache[key] = node
        
        if len(self.cache) > self.capacity:
            # Remove from tail
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]

    def verify_integrity(self):
        """Debug helper to verify list integrity forwards and backwards."""
        # Forward
        count = 0
        curr = self.head.next
        while curr != self.tail:
            count += 1
            curr = curr.next
            if count > len(self.cache): return False 
            
        count_back = 0
        curr = self.tail.prev
        while curr != self.head:
            count_back += 1
            if curr.prev is None: return False
            curr = curr.prev
            
        return count == len(self.cache) and count_back == len(self.cache)

def main():
    # Capacity 2
    lru = LRUCache(2)
    
    print("Put(1, 1)")
    lru.put(1, 1)
    print(f"Integrity check 1: {lru.verify_integrity()}") # Pass
    
    print("Put(2, 2)")
    lru.put(2, 2)
    print(f"Integrity check 2: {lru.verify_integrity()}") # Fail! 

    if lru.verify_integrity():
        print("Test PASSED")
    else:
        print("Test FAILED: Cache internal structure is broken!")

if __name__ == "__main__":
    main()