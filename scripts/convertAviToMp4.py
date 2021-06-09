import os
import sys
import moviepy.editor as mpe

avi_file_path = sys.argv[1]
mp4_output_file_path = sys.argv[2]
mp4_imitation_file_path = sys.argv[3]

#Change openpose output avi to mp4
os.popen("ffmpeg -i {input} -c:v libx264 -preset slow -crf 22 -profile:v baseline -level 3.0 -movflags +faststart -pix_fmt yuv420p -c:a libfdk_aac -b:a 128k -f mp4 {output}".format(input = avi_file_path, output = mp4_output_file_path))

#Add audio from imitaion video to the mp4 that we create
#fps=60
#my_clip = mpe.VideoFileClip(mp4_output_file_path)
#audio_background = mpe.AudioFileClip(mp4_imitation_file_path)
#final_clip = my_clip.set_audio(audio_background)
#final_clip.write_videofile(mp4_output_file_path,fps=fps)

