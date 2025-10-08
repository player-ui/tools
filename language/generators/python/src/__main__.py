"""
Module entrypoint for generating Player Components
"""

if __name__ == "__main__":

    from argparse import ArgumentParser
    from os.path import join
    from json import load
    from sys import exit

    from player_tools_xlr_types.deserializer import deserialize_xlr_node
    from player_tools_xlr_types.nodes import NamedType, ObjectType
    from .generator import generate_python_classes

    # Parse Args
    parser = ArgumentParser()
    parser.add_argument("-i", "--input", dest="input",
                        help="Directory containing a manifest.json " \
                        "that should be used for generation")
    parser.add_argument("-o", "--output",
                        dest="output",
                        default = "./dist",
                        help="Where to write the generated classes to")

    args = parser.parse_args()
    input = args.input
    output = args.output

    if not args.input:
        print("Error, must supply an input directory with `-i` or --input`")
        print("Exiting with status -1")
        exit(-1)

    # Start Processing
    with open(join(input, 'manifest.json'), 'r', encoding="utf-8") as manifest_json:
        manifest = load(manifest_json)
        capabilities = manifest['capabilities']

        #Generate Assets
        assets = capabilities.get('Assets',[])
        for asset in assets:
            with open(join(input, asset+".json"), "r", encoding="utf-8") as f:
                asset_json = f.read()
                asset_ast: NamedType[ObjectType] = deserialize_xlr_node(asset_json) # type: ignore
                generate_python_classes(asset_ast, "asset", output)

        # Generate Views
        views = capabilities.get('Views',[])
        for view in views:
            with open(join(input, view+".json"), "r", encoding="utf-8") as f:
                asset_json = f.read()
                asset_ast: NamedType[ObjectType] = deserialize_xlr_node(asset_json) # type: ignore
                generate_python_classes(asset_ast, "view", output)
