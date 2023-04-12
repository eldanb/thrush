(module 
  (import "js" "memory" (memory 1))

  (global $filterControlBlockSize (mut i32) 
    i32.const 0)

  (func (export "allocFilterHandles")
        (param $numFilters i32)
        (param $maxFilterLen i32)
        (result i32)
        
        local.get $maxFilterLen
        i32.const 8
        i32.mul
        i32.const 20                            ;; Filter offset, filter end, buffstart, buffend, buff ptr
        i32.add
        global.set $filterControlBlockSize

        global.get $filterControlBlockSize
        local.get $numFilters
        i32.mul)

  (func (export "initFilter")
        (param $filterIndex i32)
        (param $filterOffset i32)
        (param $filterSize i32)

        (local $fcbOfs i32)
        (local $fcbEnd i32)

        global.get $filterControlBlockSize
        local.get $filterIndex
        i32.mul
        local.set $fcbOfs
        
        ;; Store filterOffset in filterStart
        local.get $fcbOfs
        local.get $filterOffset
        i32.store offset=0

        ;; Compute filterEnd
        local.get $fcbOfs
        local.get $filterSize
        i32.const 8        
        i32.mul
        local.get $filterOffset
        i32.add
        i32.store offset=4

        ;; Compute bufferStart (=fcbStart + 20)
        local.get $fcbOfs
        local.get $fcbOfs
        i32.const 20
        i32.add 
        i32.store offset=8

        ;; Compute bufferEnd (=bufferStart + filterSize)
        local.get $fcbOfs
        local.get $fcbOfs        
        i32.load offset=8
        local.get $filterSize
        i32.const 8
        i32.mul
        i32.add
        i32.store offset=12

        ;; Compute bufferOfs (=bufferStart)
        local.get $fcbOfs        
        local.get $fcbOfs        
        i32.load offset=8
        i32.store offset=16

        ;; Fill buffer with 0
        local.get $fcbOfs
        global.get $filterControlBlockSize
        i32.add
        local.set $fcbEnd

        local.get $fcbOfs
        i32.const 20
        i32.add 
        local.set $fcbOfs        

        (loop 
                local.get $fcbOfs
                i64.const 0
                i64.store offset=0

                local.get $fcbOfs
                i32.const 8
                i32.add
                local.set $fcbOfs

                local.get $fcbOfs
                local.get $fcbEnd
                i32.lt_u
                br_if 0
        )
  )

  (func (export "applyFilter")
      (param $filterHandle i32) 
      (param $input i32) 
      
      (result i32) 

      (local $locFcbStart i32)      
      (local $locFilterOfs i32)
      (local $locFilterEnd i32)
      (local $locBufferStart i32)
      (local $locBufferEnd i32)
      (local $locBufferPtr i32)

      local.get $filterHandle
      global.get $filterControlBlockSize
      i32.mul
      local.set $locFcbStart

      local.get $locFcbStart
      i32.load offset=0
      local.set $locFilterOfs

      local.get $locFcbStart
      i32.load offset=4
      local.set $locFilterEnd

      local.get $locFcbStart
      i32.load offset=8
      local.set $locBufferStart

      local.get $locFcbStart
      i32.load offset=12
      local.set $locBufferEnd

      local.get $locFcbStart
      i32.load offset=16
      local.set $locBufferPtr

      ;; Mem[locBufferPtr] = input
      local.get $locBufferPtr
      local.get $input
      i64.extend_i32_s
      i64.store offset=0

      i64.const 0

      (loop (param i64) (result i64)
        ;; acc += Mem[locBufferPtr] * filter[idx]
        local.get $locBufferPtr
        i64.load offset=0
        local.get $locFilterOfs
        i64.load offset=0
        i64.mul
        i64.const 31
        i64.shr_s
        i64.add
        
        ;; Increment locBufferPtr 
        local.get $locBufferPtr
        i32.const 8
        i32.add
        local.set $locBufferPtr

        local.get $locBufferPtr
        local.get $locBufferEnd
        i32.ge_u

        (if 
           (then            
            local.get $locBufferStart
            local.set $locBufferPtr))
            
        ;; Increment locFilterOfs
        local.get $locFilterOfs
        i32.const 8
        i32.add
        local.set $locFilterOfs

        local.get $locFilterOfs
        local.get $locFilterEnd
        i32.le_u
        br_if 0
      )      

      local.get $locFcbStart      
      local.get $locBufferPtr
      i32.store offset=16

      i32.wrap_i64
  )      
)