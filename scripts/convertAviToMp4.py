import os
import sys

avi_file_path = sys.argv[1]
mp4_file_path = sys.argv[2]

os.popen("ffmpeg -i {input} -c:v libx264 -preset slow -crf 22 -profile:v baseline -level 3.0 -movflags +faststart -pix_fmt yuv420p -c:a libfdk_aac -b:a 128k -f mp4 {output}.mp4".format(input = avi_file_path, output = mp4_file_path))