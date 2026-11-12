import sys

from pypdf import PdfReader, PdfWriter


def main() -> int:
    if len(sys.argv) != 3:
        print("Cần đường dẫn file nguồn và file đích", file=sys.stderr)
        return 2

    input_path, output_path = sys.argv[1:]
    password = sys.stdin.read().rstrip("\r\n")
    reader = PdfReader(input_path)

    if reader.is_encrypted and reader.decrypt(password) == 0:
        print("Mật khẩu PDF không đúng hoặc không thể giải mã file", file=sys.stderr)
        return 3

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)

    with open(output_path, "wb") as output_file:
        writer.write(output_file)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)