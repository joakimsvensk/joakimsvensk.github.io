# Import python packages

import boto3
from botocore.client import Config
from os import listdir, path


account_id = "f53489390ded7a3fedf07a010b09cb8b" #os.environ["secret_dp_S3_ACCOUNT_ID"]
bucket_name = "roadfinder" #os.environ["secret_dp_BUCKET_NAME"]
access_key_id = "7e460144138ac04e71daec9b3362617b" #os.environ["secret_dp_S3_ACCESS_KEY"]
secret_access_key = "51c6b4b1908622556f9afc2ca052517475564373e81b7597cc8477b12bfad2d9" #os.environ["secret_dp_S3_SECRET"]
endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"


# Create a client to connect to Cloudflare's R2 Storage
s3 = boto3.client(
    's3',
    endpoint_url=endpoint_url,
    aws_access_key_id=access_key_id,
    aws_secret_access_key=secret_access_key,
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

for i in range(13,14):
    print(i)

    path = "../tiles/" + str(i)
    bucket_location = "tiles/" + str(i)

    dirs = listdir(path)
    for d in dirs:
        print(d)
        files = listdir(path + "/" + d)
        for f in files:
            print(f)
            s3.upload_file(path + "/" + d + "/" + f, bucket_name, bucket_location + "/" + d + "/" + f)


# Upload to R2 using S3 compatible API
#s3.upload_file(file_path, bucket_name, object_key)

#print(f"Uploaded {file_path} to r2://{bucket_name}/{object_key}")