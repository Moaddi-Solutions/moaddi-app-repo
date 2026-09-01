from pathlib import Path

uc = Path(r"c:/COURSES/work/mostaql/moaddi-server/app/routes/controllers/users.js").read_text(
    encoding="utf-8"
)
start = uc.index("const BASIC_ROLES")
end = uc.index("/**\n * Support audiences")
Path(r"c:/COURSES/work/mostaql/moaddi-server/scripts/_dump_users.txt").write_text(
    uc[start:end], encoding="utf-8"
)

r = Path(r"c:/COURSES/work/mostaql/moaddi-server/app/data/repos/roles.js").read_text(
    encoding="utf-8"
)
# ability require
i = r.index('require("../../lib/ability")')
# walk back to const {
j = r.rfind("const {", 0, i)
Path(r"c:/COURSES/work/mostaql/moaddi-server/scripts/_dump_roles_req.txt").write_text(
    r[j : i + len('require("../../lib/ability");')], encoding="utf-8"
)

m = Path(r"c:/COURSES/work/mostaql/moaddi-server/app/data/repos/machines.js").read_text(
    encoding="utf-8"
)
s = m.index("let syncSupplierMachines")
e = m.index("\n};\n", s) + 4
Path(r"c:/COURSES/work/mostaql/moaddi-server/scripts/_dump_sync.txt").write_text(
    m[s:e], encoding="utf-8"
)

print("dumped")
print("users len", end - start)
print("roles req:", open(r"c:/COURSES/work/mostaql/moaddi-server/scripts/_dump_roles_req.txt", encoding="utf-8").read())
