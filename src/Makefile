CC=emcc
# A few notes on the options:
#
# -s PRECISE_F32=1 is needed because of a strange bug involving the assignments 
#           of floats. Actually asm.js uses doubles for most computation, 
#           this flags ensure a behavoiur more similar to the expected one.
# --bind    needed for exporting the functions from cpp to js.
# -s DEMANGLE_SUPPORT=1 More consistent naming of the cpp functions is preserved 
#           in asm.js. Useful for cpp stacktrace inside the browser. 
# Reasonable memory options: 
# 
# -s ALLOW_MEMORY_GROWTH=1 
# -s TOTAL_MEMORY=536870912
# -s TOTAL_MEMORY=1073741824 
# -s TOTAL_MEMORY=2147483648

.SUFFIXES: .bc

CFLAGS= -I ./ -I ./eigen -s WASM=0 -s TOTAL_MEMORY=1073741824 --memory-init-file 0 -std=c++11 -s PRECISE_F32=1 -s DEMANGLE_SUPPORT=1 --bind  -Os -s ASSERTIONS=1

OBJ = hexalab_js.bc \
      app.bc \
      builder.bc \
      color_map.bc \
      loader.bc \
      plane_filter.bc \
      peeling_filter.bc \
      quality_filter.bc \
	  mesh.bc \
      pick_filter.bc

DEPS = app.h \
	   builder.h \
	   color_map.h \
	   common.h \
	   hex_quality.h \
	   hex_quality_color_maps.h \
	   ifilter.h \
	   loader.h \
	   mesh.h \
	   model.h \
	   peeling_filter.h \
	   plane_filter.h \
	   quality_filter.h \
	   pick_filter.h


hexalab_asm.js: $(OBJ) 
	$(CC) -o ../js/generated/$@ $^ $(CFLAGS) -s LINKABLE=0

color_map.bc: color_map.cpp
	$(CC) -c -o color_map.bc $< $(CFLAGS) -s LINKABLE=1
	
loader.bc: loader.cpp
	$(CC) -c -o loader.bc $< $(CFLAGS) -s LINKABLE=1

app.bc: app.cpp
	$(CC) -c -o app.bc $< $(CFLAGS) -s LINKABLE=1

mesh.bc: mesh.cpp
	$(CC) -c -o mesh.bc $< $(CFLAGS) -s LINKABLE=1

peeling_filter.bc: peeling_filter.cpp
	$(CC) -c -o $@ $< $(CFLAGS) -s LINKABLE=1

%.bc : %.cpp $(DEPS)
	$(CC) -c -o $@ $< $(CFLAGS)
	
builder.bc : builder.cpp $(DEPS)
	$(CC) -c -o $@ $< $(CFLAGS)
	
hexalab_js.bc: hexalab_js.cpp
	$(CC) -c -o $@ $< $(CFLAGS) -s LINKABLE=1
	
clean:
	rm -f *.bc ../js/generated/*.js 
