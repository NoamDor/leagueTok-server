import os
import json
import sys

FEET_VERTICES = ['11', '14', '19', '20', '21', '22', '23', '24']

def main():
    # print(is_video_valid("C:\\temp\\1\\imitation"))

    source_files_dir = sys.argv[1]
    imitation_files_dir = sys.argv[2]
    source_files = os.listdir(source_files_dir)
    imitation_files = os.listdir(imitation_files_dir)
    sum_score = 0

    for source_file_name, imitation_file_name in zip(source_files, imitation_files):
        with open(f'{source_files_dir}\\{source_file_name}') as source_file, \
             open(f'{imitation_files_dir}\\{imitation_file_name}') as imitation_file:
            sum_score += get_frame_score(json.load(source_file)["part_candidates"][0],
                                         json.load(imitation_file)["part_candidates"][0])

    print(f'{sum_score / len(list(zip(source_files, imitation_files))) * 100}')

def is_video_valid(directory):
    num_invalid_frames = 0
    files = os.listdir(directory)
    for filename in files:
        with open(directory + "\\" + filename) as file:
            if (not(is_frame_valid(file))):
                num_invalid_frames += 1

    return num_invalid_frames < 0.33 * len(files)

def is_frame_valid(file):
    vertices = json.load(file)["part_candidates"][0]
    remove_feet_vertices(vertices)
    num_invalid_vertices = 0
    for i, vertex in vertices.items():
        if len(vertex) == 0 or vertex[2] < 0.3:
            num_invalid_vertices += 1

    return num_invalid_vertices <= 4

def get_frame_score(source_vertices, imitation_vertices):
    remove_feet_vertices(source_vertices)
    remove_feet_vertices(imitation_vertices)
    if is_empty_vertices(imitation_vertices) == False:
        normalize_frame(imitation_vertices)
    if is_empty_vertices(source_vertices) == False:
        normalize_frame(source_vertices)

    close_vertices = 0

    for (i, source_vertex), (j, imitation_vertex) in zip(source_vertices.items(), imitation_vertices.items()):
        if len(source_vertex) and not len(imitation_vertex):
           continue

        elif (not len(source_vertex) and not len(imitation_vertex)) or \
             (not len(source_vertex)):
            close_vertices += 1
            continue

        elif abs(source_vertex[0] - imitation_vertex[0]) <= 0.15 and \
           abs(source_vertex[1] - imitation_vertex[1]) <= 0.15:
            close_vertices += 1

    return close_vertices / len(source_vertices)

def remove_feet_vertices(vertices):
    for i in FEET_VERTICES:
        del vertices[i]

def normalize_frame(vertices):
    '''
    Normalizes the frame vertices
    :param vertices: vertices of the frame
    :return:
    '''
    x_min = min(vertex[0] for i, vertex in vertices.items() if len(vertex) > 0)
    x_max = max(vertex[0] for i, vertex in vertices.items() if len(vertex) > 0)
    y_min = min(vertex[1] for i, vertex in vertices.items() if len(vertex) > 0)
    y_max = max(vertex[1] for i, vertex in vertices.items() if len(vertex) > 0)

    for i, vertex in vertices.items():
        if (len(vertex)):
            normalized_vertex = [(vertex[0] - x_min) / (x_max - x_min),
                                 (vertex[1] - y_min) / (y_max - y_min),
                                 vertex[2]]
            vertices[i] = normalized_vertex


if __name__ == '__main__':
    main()