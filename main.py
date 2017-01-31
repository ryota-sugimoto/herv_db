#!/usr/bin/env python
# -*- coding: utf-8 -*-

from twisted.web.static import File
from twisted.enterprise import adbapi
from natsort import natsorted
from klein import Klein
import json

app = Klein()
dbpool = adbapi.ConnectionPool("pymysql",
  host='database-db-instance.cvtysiszh5lk.ap-northeast-1.rds.amazonaws.com',
  port=3306,
  user='web',
  passwd='hervdb508',
  db='Graph_db',
  charset='utf8')

def get_params(request):
  d = {}
  hcre = request.args.get("hcre", ["true"])[0]
  if hcre == "true":
    d["hcre"] = "Yes"
  elif hcre == "false":
    d["hcre"] = "Yes|No"
  else:
    d["hcre"] = "Yes"
  
  z_score = request.args.get("z_score", ["3"])[0]
  try:
    d["z_score"] = str(float(z_score))
  except ValueError:
    d["z_score"] =" 3"
  
  db = request.args.get("db", ["Roadmap|ENCODE"])[0]
  if db == "Roadmap|ENCODE" or db == "Roadmap" or db == "ENCODE":
    d["db"] = db
  else:
    d["db"] = "Roadmap|ENCODE"
  
  limit = request.args.get("limit", ["10"])[0]
  if limit.isdigit() and int(limit) >= 0:
    d["limit"] = limit
  else:
    d["limit"] = "10"
  
  representative = request.args.get("representative", ["true"])[0]
  if representative == "true":
    d["representative"] = True
  elif representative == "false":
    d["representative"] = False
  else:
    d["representative"] = True
  
  z_score_mode = request.args.get("z_score_mode", ["Count"])[0]
  if z_score_mode == "Count" or z_score_mode == "Depth":
    d["z_score_mode"] = z_score_mode
  else:
    d["z_score_mode"] = "Count"
  

  merge_cell_types = request.args.get("merge_cell_types", ["true"])[0]
  if merge_cell_types == "true":
    d["merge_cell_types"] = True
  elif merge_cell_types == "false":
    d["merge_cell_types"] = False
  else:
    d["merge_cell_types"] = True
  
  d["tf"] = request.args.get("tf", ["all"])[0]
  
  
  return d

@app.route("/static/", branch=True)
def static(request):
  return File("./static")

main_html = "".join(list(open("static/main.html")))
@app.route("/")
def pg_main_root(request):
  return main_html

def convert_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0]
    d["y"] = map(int, t[1].split(","))
    d["mode"] = "line"
    res.append(d)
  res.append({"name": "dummy", "y": [], "mode": "line", "showlegend": "False"})
  return json.dumps(res)
@app.route("/graph_data/tfbs_depth/<herv_name>")
def tbfs_depth(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  query = 'SELECT T.TF, D.Depth FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN TFBS_depth AS D WHERE HT.HERV="%(herv_name)s" AND HT.HCREs REGEXP "%(hcre)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_z_score >= %(z_score)s ORDER BY HT.%(z_score_mode)s_based_z_score DESC LIMIT %(limit)s;'
  params = get_params(request)
  params["herv_name"] = str(herv_name)
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(convert_json)
  return d
  
@app.route("/graph_data/motif_depth/<herv_name>")
def motif_depth(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  query = 'SELECT T.TF, D.Depth FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Motif_depth AS D WHERE HT.HERV="%(herv_name)s" AND HT.HCREs REGEXP "%(hcre)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_z_score >= %(z_score)s ORDER BY HT.%(z_score_mode)s_based_z_score DESC LIMIT %(limit)s ;'
  params = get_params(request)
  params["herv_name"] = str(herv_name)
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(convert_json)
  return d

@app.route("/graph_data/motif_depth_dot/<herv_name>")
def motif_depth_dot(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type",
                                       "application/json")
  query = 'SELECT SQ.HERV, SQ.TF, M.Motif_Id, M.Start_in_consensus_seq, M.End_in_consensus_seq, SQ.Depth FROM Motif_Id AS M NATURAL JOIN (HCREs_Id AS HC NATURAL JOIN (SELECT * FROM((HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Motif_depth AS D) WHERE HT.HERV="%(herv_name)s" AND HT.HCREs REGEXP "%(hcre)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_z_score >= %(z_score)s ORDER BY HT.%(z_score_mode)s_based_z_score DESC LIMIT %(limit)s) AS SQ);'
  params = get_params(request)
  params["herv_name"] = str(herv_name)
  query %= params
  d = dbpool.runQuery(query)
  def f(l):
    res = []
    for t in l:
      d = {}
      start,end = int(t[3]), int(t[4])
      d["x"] = [int((start + end)/2.0)]
      d["y"] = [int(max(t[5].split(",")[start:end]))*1.05]
      d["mode"] = "markers"
      d["name"] = t[1] + "_" + t[2]
      res.append(d)
    return json.dumps(res)
  d.addCallback(f)
  return d

def dhs_convert_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0].replace("UniPk","")
    d["y"] = [ int(i) for i in t[1].split(",") ]
    d["mode"] = "line"
    res.append(d)
  return json.dumps(res)
@app.route("/graph_data/dhs_depth/<herv_name>")
def dhs_depth(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  params = get_params(request)
  if params["representative"]:
    query = 'SELECT DHS_data, Depth FROM DHS_depth WHERE HERV="%(herv_name)s" AND DHS_Data IN ("UwdukeGm12878UniPk","UwdukeH1hescUniPk","UwdukeK562UniPk","UwdukeHepg2UniPk","UwdukeHelas3UniPk","UwdukeHuvecUniPk","UwdukeA549UniPk","UwdukeMcf7UniPk") AND Z_score >= %(z_score)s ORDER BY Z_score DESC LIMIT %(limit)s;'
  else:
    query = 'SELECT DHS_data, Depth FROM DHS_depth WHERE HERV="%(herv_name)s" AND Z_score >= %(z_score)s ORDER BY Z_score DESC LIMIT %(limit)s;'
  params["herv_name"] = herv_name
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(dhs_convert_json)
  return d

def chromatin_state_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0]
    d["x"] = ["TSS", "PF", "E", "WE", "CTCF", "T", "R"]
    d["y"] = [ float(i) for i in t[1].split(",") ]
    d["type"] = "bar"
    res.append(d)
  return json.dumps(res)
@app.route("/graph_data/chromatin_state/<herv_name>")
def chromatin_state_depth(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  query = 'SELECT Cell, States FROM Chromatin_state WHERE HERV="%s";'
  query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  d.addCallback(chromatin_state_json)
  return d

def ortholog_map_json(t):
  s = t[0][0]
  res = { "type": "heatmap",
          "colorscale": [[0, "white"], [1,"black"]],
          "showscale": False }

  res["x"] = ["Chimpanzee", "Gorilla", "Orangutan", "Gibon", "Rhesus",
              "Marmoset", "Tarsier", "Mouse lemur", "Mouse", "Cow", "Dog"]
  res["y"] = []
  res["z"] = []
  for i,ss in enumerate(s.split("|")):
    l = ss.split(",")
    res["y"].append(i)
    res["z"].append(map(int,l[1:]))
  return json.dumps([res])
@app.route("/graph_data/ortholog/<herv_name>")
def ortholog_graph(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  query = 'SELECT Locus_Ortholog FROM Ortholog_with_phylogeny WHERE HERV="%s";'
  query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  d.addCallback(ortholog_map_json)
  return d

def TFBS_map_json(t):
  res = { "type": "heatmap",
          "colorscale": [[0, "white"], [1,"red"]],
          "showscale": False }
  n_x = len(t)
  if n_x == 0:
    return json.dumps([])
  n_y = len(t[0][1].split(","))
  res["x"] = [x for x,z in t]
  res["y"] = range(n_y)
  res["z"] = [[0] * n_x for _ in range(n_y)]
  for ix,(_,zz) in enumerate(t):
    zz = map(int, zz.split(","))
    for iy,z in enumerate(zz):
      res["z"][iy][ix] = z
  return json.dumps([res])
@app.route("/graph_data/TFBS_phylogeny/<herv_name>")
def TFBS_phylogeny_graph(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  query = 'SELECT T.TF, TB.TF_binding FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN TFBS_with_phylogeny AS TB WHERE HT.HERV="%(herv_name)s" AND HT.HCREs REGEXP "%(hcre)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_z_score >= %(z_score)s ORDER BY HT.%(z_score_mode)s_based_z_score DESC LIMIT %(limit)s ;'
  params = get_params(request)
  params["herv_name"] = herv_name
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(TFBS_map_json)
  return d

def motif_map_json(t):
  res = { "type": "heatmap",
          "colorscale": [[0, "black"], [10**(-4)-10**(-10), "black"],
                         [10**(-4),"grey"], [10**(-3),"grey"],
                         [10**(-3)+10**(-10), "white"], [1, "white"]],
          "showscale": False }
  n_x = len(t)
  if n_x == 0:
    return json.dumps([])
  n_y = len(t[0][2].split(","))
  res["x"] = [x1+"_"+x2 for x1,x2,_ in t]
  res["y"] = range(n_y)
  res["z"] = [[0] * n_x for _ in range(n_y)]
  for ix,(_,_,zz) in enumerate(t):
    zz = map(float, zz.split(","))
    for iy,z in enumerate(zz):
      res["z"][iy][ix] = z
  return json.dumps([res])
@app.route("/graph_data/motif_phylogeny/<herv_name>")
def motif_phylogeny_graph(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "application/json")
  query = 'SELECT T.TF, M.Motif_Id, Phy.P_value FROM((( Motif_with_phylogeny AS Phy NATURAL JOIN Motif_Id AS M) NATURAL JOIN HCREs_Id AS HC) NATURAL JOIN HERV_TFBS_Id AS HT) NATURAL JOIN TFBS_Id AS T WHERE HT.HERV="%(herv_name)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_z_score >= %(z_score)s ORDER BY HT.%(z_score_mode)s_based_z_score DESC ;'
  params = get_params(request)
  params["herv_name"] = herv_name
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(motif_map_json)
  return d

@app.route("/image/tree/<herv_name>")
def tree_image(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type",
                                       "image/png")
  query = 'SELECT * FROM Tree_image WHERE HERV="%s";'
  query %= herv_name
  d = dbpool.runQuery(query)
  d.addCallback(lambda l: str(l[0][1]) if l else "")
  return d

def dl_hcre_format(l):
  res = ["#HERV/LR_type\tTF\tMotif_Id\tMatched_motif\tMotif_source\tStart_position_in_consensus_seq\tEnd_position_in_consensus_seq"]
  for t in l:
    res.append("\t".join(str(i) for i in t))
  return "\n".join(res)
@app.route("/download/hcre/<herv_name>")
def dl_hcre(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "text/tab-separated-values")
  query = 'SELECT HC.HERV, T.TF, M.Motif_Id, M.Motif_name, M.Motif_origin, M.Start_in_consensus_seq, M.End_in_consensus_seq FROM(Motif_Id AS M NATURAL JOIN HCREs_Id AS HC) NATURAL JOIN TFBS_Id AS T WHERE HC.HERV = "%s";'
  query %= (str(herv_name), )
  d = dbpool.runQuery(query)
  d.addCallback(dl_hcre_format)
  return d


@app.route("/download/herv_tfbs_position/<herv_name>")
def dl_herv_tfbs_position(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                      "text/tab-separated-values")
  params = get_params(request)
  if params["tf"] == "all":
    tf_query = ";"
  else:
    tf_query = ' AND T.TF = "%s";' % (params["tf"],)

  if params["merge_cell_types"]:
    query = 'SELECT P.Chrom, P.Start, P.End, HT.HERV, T.TF, P.Locus FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Position_HERV_TFBS_Merged AS P WHERE HT.HERV = "%s"' + tf_query
  else:
    query = 'SELECT P.Chrom, P.Start, P.End, HT.HERV, T.TF, P.Locus, D.Cell_name, D.Note, D.File_name FROM((HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Position_HERV_TFBS_in_each_cell AS P) NATURAL JOIN Dataset AS D WHERE HT.HERV = "%s"' + tf_query

  query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  def dl_herv_tfbs_position_format(l):
    if params["merge_cell_types"]:
      res = ["#Chrom\tStart\tEnd\tHERV/LR_type\tTF\tHERV/LR_locus"]
    else:
      res = ["#Chrom\tStart\tEnd\tHERV/LR_type\tTF\tHERV/LR_locus\tCell\tNote\tTFBSs_source"]
    for t in l:
      res.append("\t".join(str(i) for i in t))
    return "\n".join(res)
  d.addCallback(dl_herv_tfbs_position_format)
  return d

@app.route("/download/hcre_position/<herv_name>")
def dl_hcre_position(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                      "text/tab-separated-values")
  params = get_params(request)
  if params["tf"] == "all":
    tf_query = ";"
  else:
    tf_query = ' AND T.TF = "%s";' % (params["tf"],)

  if params["merge_cell_types"]:
    query = 'SELECT P.Chrom, P.Start, P.End, HT.HERV, T.TF, P.Locus, P.Motif_Id, P.Motif_strand, P.Motif_pval, P.Match_sequence FROM((HCREs_Id AS HC NATURAL JOIN HERV_TFBS_Id AS HT) NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Position_HCREs AS P WHERE HT.HERV = "%s"' + tf_query
  else:
    query = 'SELECT P.Chrom, P.Start, P.End, HT.HERV, T.TF, P.Locus, P.Motif_Id, P.Motif_strand, P.Motif_pval, P.Match_sequence, D.Cell_name, D.Note, D.File_name FROM((((HCREs_Id AS HC NATURAL JOIN HERV_TFBS_Id AS HT) NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Position_HCREs AS P) NATURAL JOIN Mapping_HCREs_Dataset AS MP) NATURAL JOIN Dataset AS D WHERE HT.HERV = "%s"' + tf_query

  query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  def dl_hcre_position_format(l):
    if params["merge_cell_types"]:
      res = ["#Chrom\tStart\tEnd\tHERV/LR_type\tTF\tHERV/LR_locus\tMotif_Id\tMotif_strand\tMotif_P-value\tMatched_Sequence"]
    else:
      res = ["#Chrom\tStart\tEnd\tHERV/LR_type\tTF\tHERV/LR_locus\tMotif_Id\tMotif_strand\tMotif_P-value\tMatched_Sequence\tCell\tNote\tTFBSs_source"]
    for t in l:
      res.append("\t".join(str(i) for i in t))
    return "\n".join(res)
  d.addCallback(dl_hcre_format)
  return d

@app.route("/download/dhs_position/<herv_name>")
def dl_dhs_position(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type", 
                                       "text/tab-separated-values")
  query = 'SELECT P.Chrom, P.Start, P.End, P.HERV, P.Cell_name, P.Locus FROM Position_HERV_DHS AS P WHERE P.HERV = "%s";'
  query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  def dl_dhs_position_format(l):
    res = ["#Chrom\tStart\tEnd\tHERV/LR_type\tCell\tHERV/LR_locus"]
    for t in l:
      res.append("\t".join(str(i) for i in t))
    return "\n".join(res)
  d.addCallback(dl_dhs_position_format)
  return d

@app.route("/download/ontology/<herv_name>")
def dl_ontology(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type",
                                      "text/tab-separated-values")
  params = get_params(request)
  if params["tf"] != "all":
    if params["merge_cell_types"]:
      header = "#HERV/LR_type\tTF\tGO_Id\tDescription\tP_value\tFDR\tFER\tFold_enrichment\tHit_number\tHit_gene_number\tHit_genes"
      query = 'SELECT GO.HERV, T.TF, GO.GO_Id, GO.GO_description, GO.P_value, GO.FDR, GO.FER, GO.Fold_enrichment, GO.Hit_num, GO.Hit_gene_num, GO.HIT_genes FROM HCREs_GO_Merge AS GO NATURAL JOIN TFBS_Id AS T WHERE GO.HERV = "%s" AND T.TF = "%s" ;'
    else:
      header = "#HERV/LR_type\tTF\tCell\tGO_Id\tDescription\tP_value\tFDR\tFER\tFold_enrichment\tNumber_of_hit_HCREs\tNumber_of_hit_genes\tHit_genes"
      query = 'SELECT GO.HERV, T.TF, GO.Cell_name, GO.GO_Id, GO.GO_description, GO.P_value, GO.FDR, GO.FER, GO.Fold_enrichment, GO.Hit_num, GO.Hit_gene_num, GO.HIT_genes FROM HCREs_GO_Each AS GO NATURAL JOIN TFBS_Id AS T WHERE GO.HERV = "%s" AND T.TF = "%s" ;'
    query %= (str(herv_name), params["tf"])
  else:
    if params["merge_cell_types"]:
      header = "#HERV/LR_type\tTF\tGO_Id\tDescription\tP_value\tFDR\tFER\tFold_enrichment\tHit_number\tHit_gene_number\tHit_genes"
      query = 'SELECT GO.HERV, T.TF, GO.GO_Id, GO.GO_description, GO.P_value, GO.FDR, GO.FER, GO.Fold_enrichment, GO.Hit_num, GO.Hit_gene_num, GO.HIT_genes FROM HCREs_GO_Merge AS GO NATURAL JOIN TFBS_Id AS T WHERE GO.HERV = "%s" ;'
    else:
      header = "#HERV/LR_type\tTF\tCell\tGO_Id\tDescription\tP_value\tFDR\tFER\tFold_enrichment\tNumber_of_hit_HCREs\tNumber_of_hit_genes\tHit_genes"
      query = 'SELECT GO.HERV, T.TF, GO.Cell_name, GO.GO_Id, GO.GO_description, GO.P_value, GO.FDR, GO.FER, GO.Fold_enrichment, GO.Hit_num, GO.Hit_gene_num, GO.HIT_genes FROM HCREs_GO_Each AS GO NATURAL JOIN TFBS_Id AS T WHERE GO.HERV = "%s" ;'
    query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  d.addCallback(lambda l: "\n".join([header]+["\t".join(map(str,t)) for t in l]))
  return d

@app.route("/tf_list/<herv_name>")
def tf_list(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type",
                                       "application/json")
  query = 'SELECT T.TF FROM HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T WHERE HT.HERV="%(herv_name)s" AND HT.HCREs REGEXP "%(hcre)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_z_score >= %(z_score)s ORDER BY HT.%(z_score_mode)s_based_z_score DESC LIMIT %(limit)s ;'
  params = get_params(request)
  params["herv_name"] = str(herv_name)
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(lambda l: json.dumps([t[0] for t in l]))
  return d

@app.route("/dhs_celltype_list/<herv_name>")
def dhs_celltype_list(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type",
                                      "application/json")
  params = get_params(request)
  if params["representative"]:
    query = 'SELECT DHS_data FROM DHS_depth WHERE HERV="%(herv_name)s" AND DHS_Data IN ("UwdukeGm12878UniPk","UwdukeH1hescUniPk","UwdukeK562UniPk","UwdukeHepg2UniPk","UwdukeHelas3UniPk","UwdukeHuvecUniPk","UwdukeA549UniPk","UwdukeMcf7UniPk") AND Z_score >= %(z_score)s ORDER BY Z_score DESC LIMIT %(limit)s;'
  else:
    query = 'SELECT DHS_data FROM DHS_depth WHERE HERV="%(herv_name)s" AND Z_score >= %(z_score)s ORDER BY Z_score DESC LIMIT %(limit)s;'
  params["herv_name"] = str(herv_name)
  query %= params
  d = dbpool.runQuery(query)
  d.addCallback(lambda l: json.dumps([t[0].replace("UniPk","") for t in l]))
  return d

@app.route("/info/<herv_name>")
def herv_info(request, herv_name):
  request.responseHeaders.addRawHeader("Content-Type",
                                      "application/json")
  query = 'SELECT HERV, Family, Copy_number, Integration_date FROM HERVs WHERE HERV = "%s" ;'
  query %= (str(herv_name),)
  d = dbpool.runQuery(query)
  def f(l):
    return json.dumps({ "herv": l[0][0],
                        "family": l[0][1],
                        "copy_number": l[0][2],
                        "integration_data": l[0][3]})
  d.addCallback(f)
  return d

@app.route("/herv_list")
def herv_list(request):
  request.responseHeaders.addRawHeader("Content-Type",
                                       "application/json")
  params = get_params(request)
  query = 'SELECT HT.HERV, count(HT.HERV) FROM HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T WHERE HT.HCREs REGEXP "%(hcre)s" AND T.Project REGEXP "%(db)s" AND HT.%(z_score_mode)s_based_Z_score >= %(z_score)s GROUP BY HT.HERV ;'
  query %= params
  d = dbpool.runQuery(query)
  def f(l):
    res = []
    for t in l:
      d = {}
      d["herv_name"] = t[0]
      d["n"] = t[1]
      res.append(d)
    res = natsorted(res, key=lambda d: d["herv_name"])
    return json.dumps(res)
  d.addCallback(f)
  return d


import argparse
parser = argparse.ArgumentParser()
parser.add_argument("host")
parser.add_argument("port",type=int)
args = parser.parse_args()

app.run(args.host, args.port)
